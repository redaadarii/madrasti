package ma.madrasti.user;

import ma.madrasti.audit.AuditAction;
import ma.madrasti.audit.AuditService;

import ma.madrasti.common.ConflictException;
import ma.madrasti.common.NotFoundException;
import ma.madrasti.common.PageResponse;
import ma.madrasti.school.School;
import ma.madrasti.school.SchoolRepository;
import ma.madrasti.user.UserDtos.CreateUserRequest;
import ma.madrasti.user.UserDtos.UpdateUserRequest;
import ma.madrasti.user.UserDtos.UserResponse;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@Transactional
public class UserService {

    private final UserRepository users;
    private final SchoolRepository schools;
    private final PasswordEncoder passwordEncoder;

    private final AuditService audit;
    private final ma.madrasti.auth.RefreshTokenService refreshTokens;

    public UserService(UserRepository users, SchoolRepository schools, PasswordEncoder passwordEncoder, AuditService audit, ma.madrasti.auth.RefreshTokenService refreshTokens) {
        this.refreshTokens = refreshTokens;
        this.audit = audit;
        this.users = users;
        this.schools = schools;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional(readOnly = true)
    public PageResponse<UserResponse> search(String q, Role role, Pageable pageable) {
        var query = StringUtils.hasText(q) ? q.trim() : null;
        return PageResponse.of(users.search(query, role, pageable), UserResponse::from);
    }

    @Transactional(readOnly = true)
    public UserResponse get(Long id) {
        return UserResponse.from(find(id));
    }

    public UserResponse create(CreateUserRequest request) {
        if (users.existsByEmailIgnoreCase(request.email())) {
            throw new ConflictException("error.email.taken");
        }
        var user = new User(request.email().toLowerCase(), passwordEncoder.encode(request.password()),
                request.firstName(), request.lastName(), request.role());
        user.setPhone(request.phone());
        user.setSchool(school(request.schoolId()));
        var saved = users.save(user);
        audit.record(AuditAction.USER_CREATED, saved.getEmail(), "role=" + saved.getRole());
        return UserResponse.from(saved);
    }

    public UserResponse update(Long id, UpdateUserRequest request) {
        var user = find(id);
        if (!user.getEmail().equalsIgnoreCase(request.email()) && users.existsByEmailIgnoreCase(request.email())) {
            throw new ConflictException("error.email.taken");
        }
        user.setEmail(request.email().toLowerCase());
        user.setFirstName(request.firstName());
        user.setLastName(request.lastName());
        user.setPhone(request.phone());
        user.setRole(request.role());
        user.setSchool(school(request.schoolId()));
        user.setActive(request.active());
        if (!user.isActive()) {
            refreshTokens.revokeAllOf(user.getId());
        }
        audit.record(AuditAction.USER_UPDATED, user.getEmail(), "role=" + user.getRole() + ", active=" + user.isActive());
        return UserResponse.from(user);
    }

    public void resetPassword(Long id, String password) {
        var user = find(id);
        user.setPasswordHash(passwordEncoder.encode(password));
        refreshTokens.revokeAllOf(user.getId());
        audit.record(AuditAction.PASSWORD_RESET, user.getEmail(), null);
    }

    public void delete(Long id) {
        var user = find(id);
        users.delete(user);
        audit.record(AuditAction.USER_DELETED, user.getEmail(), "role=" + user.getRole());
    }

    private User find(Long id) {
        return users.findById(id).orElseThrow(() -> new NotFoundException("user", id));
    }

    private School school(Long schoolId) {
        return schoolId == null ? null
                : schools.findById(schoolId).orElseThrow(() -> new NotFoundException("school", schoolId));
    }
}
