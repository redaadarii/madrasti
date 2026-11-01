package ma.madrasti.user;

import ma.madrasti.user.UserDtos.UserResponse;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Annuaire en lecture seule (listes déroulantes enseignants / parents) pour la direction. */
@RestController
@RequestMapping("/api/users")
@PreAuthorize("hasAnyRole('ADMIN','DIRECTOR')")
public class UserDirectoryController {

    private final UserService userService;

    public UserDirectoryController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping
    public List<UserResponse> byRole(@RequestParam Role role) {
        return userService.search(null, role, PageRequest.of(0, 500, Sort.by("lastName"))).content();
    }
}
