// Assemble les diapositives (slide-NN.png) et leur narration (slide-NN.m4a, AAC) en une vidéo MP4 H.264 + AAC.
// Usage : swift docs/video/assemble.swift <dossier des diapositives> <fichier mp4 de sortie>
import AVFoundation
import AppKit

let args = CommandLine.arguments
let dir = URL(fileURLWithPath: args[1])
let output = URL(fileURLWithPath: args[2])
let size = CGSize(width: 1920, height: 1080)
let pause = 0.9   // silence après chaque narration
let fade = 0.5    // fondu enchaîné entre deux diapositives
let fps: Int32 = 10

let pngs = try FileManager.default.contentsOfDirectory(at: dir, includingPropertiesForKeys: nil)
    .filter { $0.pathExtension == "png" }.sorted { $0.lastPathComponent < $1.lastPathComponent }

// Durée de chaque diapositive = narration + pause.
var durations: [Double] = []
for png in pngs {
    let audio = AVURLAsset(url: png.deletingPathExtension().appendingPathExtension("m4a"))
    durations.append(try await audio.load(.duration).seconds + pause)
}

func cgImage(_ url: URL) -> CGImage {
    let image = NSImage(contentsOf: url)!
    var rect = CGRect(origin: .zero, size: size)
    return image.cgImage(forProposedRect: &rect, context: nil, hints: nil)!
}

// 1. Piste vidéo (sans son) dans un fichier temporaire.
let silent = FileManager.default.temporaryDirectory.appendingPathComponent("madrasti-video-\(UUID()).mp4")
let writer = try AVAssetWriter(outputURL: silent, fileType: .mp4)
let input = AVAssetWriterInput(mediaType: .video, outputSettings: [
    AVVideoCodecKey: AVVideoCodecType.h264, AVVideoWidthKey: size.width, AVVideoHeightKey: size.height,
    AVVideoCompressionPropertiesKey: [AVVideoAverageBitRateKey: 700_000]])
let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: input, sourcePixelBufferAttributes: [
    kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32ARGB,
    kCVPixelBufferWidthKey as String: size.width, kCVPixelBufferHeightKey as String: size.height])
writer.add(input)
writer.startWriting()
writer.startSession(atSourceTime: .zero)

func frame(_ current: CGImage, _ next: CGImage?, mix: CGFloat) -> CVPixelBuffer {
    var buffer: CVPixelBuffer?
    CVPixelBufferPoolCreatePixelBuffer(nil, adaptor.pixelBufferPool!, &buffer)
    CVPixelBufferLockBaseAddress(buffer!, [])
    let ctx = CGContext(data: CVPixelBufferGetBaseAddress(buffer!), width: Int(size.width), height: Int(size.height),
                        bitsPerComponent: 8, bytesPerRow: CVPixelBufferGetBytesPerRow(buffer!),
                        space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.noneSkipFirst.rawValue)!
    ctx.draw(current, in: CGRect(origin: .zero, size: size))
    if let next, mix > 0 {
        ctx.setAlpha(mix)
        ctx.draw(next, in: CGRect(origin: .zero, size: size))
    }
    CVPixelBufferUnlockBaseAddress(buffer!, [])
    return buffer!
}

var frameIndex: Int64 = 0
let images = pngs.map(cgImage)
for (i, image) in images.enumerated() {
    let next = i + 1 < images.count ? images[i + 1] : nil
    let total = Int(durations[i] * Double(fps))
    let fadeFrames = next == nil ? 0 : Int(fade * Double(fps))
    for f in 0..<total {
        while !input.isReadyForMoreMediaData { usleep(2_000) }
        let mix = f >= total - fadeFrames ? CGFloat(f - (total - fadeFrames) + 1) / CGFloat(fadeFrames) : 0
        adaptor.append(frame(image, next, mix: mix), withPresentationTime: CMTime(value: frameIndex, timescale: fps))
        frameIndex += 1
    }
}
input.markAsFinished()
await writer.finishWriting()

// 2. Ajout de la narration, chaque piste démarrant avec sa diapositive.
let composition = AVMutableComposition()
let videoAsset = AVURLAsset(url: silent)
let videoTrack = try await videoAsset.loadTracks(withMediaType: .video)[0]
let videoDuration = try await videoAsset.load(.duration)
try composition.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid)!
    .insertTimeRange(CMTimeRange(start: .zero, duration: videoDuration), of: videoTrack, at: .zero)
let audioTrack = composition.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid)!
var start = 0.0
for (i, png) in pngs.enumerated() {
    let audio = AVURLAsset(url: png.deletingPathExtension().appendingPathExtension("m4a"))
    let track = try await audio.loadTracks(withMediaType: .audio)[0]
    let duration = try await audio.load(.duration)
    try audioTrack.insertTimeRange(CMTimeRange(start: .zero, duration: duration), of: track,
                                   at: CMTime(seconds: start + 0.25, preferredTimescale: 600))
    start += durations[i]
}

try? FileManager.default.removeItem(at: output)
let export = AVAssetExportSession(asset: composition, presetName: AVAssetExportPresetPassthrough)!
try await export.export(to: output, as: .mp4)
try? FileManager.default.removeItem(at: silent)
print("Vidéo : \(output.path) (\(Int(start)) s)")
