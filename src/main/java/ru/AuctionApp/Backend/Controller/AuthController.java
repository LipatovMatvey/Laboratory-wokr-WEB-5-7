package ru.AuctionApp.Backend.Controller;


import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import ru.AuctionApp.Backend.DTO.UserDTO;
import ru.AuctionApp.Backend.Entity.User;
import ru.AuctionApp.Backend.Services.AuthService;
import java.util.Map;

/**
 * Контроллер, отвечающий за регистрацию, авторизацию,
 * проверку статуса пользователя и выход из системы.
 * Все методы работают через HTTP-сессии, храня в ней userId после успешного входа.
 */
@RestController
@RequestMapping("/auth")
public class AuthController {

    /**
     * Обработчик всех ошибок RuntimeException,
     * возвращающий JSON-ответ вида {"error":"сообщение"}.
     *
     * @param ex - исключение, возникшее в процессе обработки запроса
     * @return - карта с текстом ошибки
     */
    @ExceptionHandler(RuntimeException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Map<String, String> handleError(RuntimeException ex) {
        return Map.of("error", ex.getMessage());
    }

    @Autowired
    private AuthService authService;

    /**
     * Регистрирует нового пользователя.
     * После успешной регистрации создаёт сессию и возвращает данные пользователя.
     * @param email - Электронная почта
     * @param fullName - ФИО
     * @param birthDate - дата рождения
     * @param password - пароль
     * @param avatar - файл изображения (необязательный)
     * @param role - роль, если регистрирует админ
     * @param session - текущая HTTP-сессия
     * @return - данные зарегистрированного пользователя
     */
    @PostMapping(value = "/register", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public UserDTO register(
            @RequestParam("email") String email,
            @RequestParam("fullName") String fullName,
            @RequestParam("birthDate") String birthDate,
            @RequestParam("password") String password,
            @RequestParam(value = "avatar", required = false) MultipartFile avatar,
            @RequestParam(required = false) String role,
            HttpSession session
    ) {
        return authService.register(email, fullName, birthDate, password, avatar, role, session);
    }

    /**
     * Авторизует пользователя по email и паролю.
     *
     * @param loginData - объект User, содержащий email и password
     * @param session - текущая HTTP-сессия
     * @return - данные авторизованного пользователя
     */
    @PostMapping("/login")
    public UserDTO login(@RequestBody User loginData, HttpSession session) {

        UserDTO dto = authService.login(loginData.getEmail(), loginData.getPassword());

        // если вошёл успешно — сохраняем userId в сессию
        session.setAttribute("userId", dto.getId());

        return dto;
    }

    /**
     * Возвращает данные текущего пользователя по его сессии.
     * Если пользователь не авторизован — возвращается DTO с authenticated=false.
     *
     * @param session - текущая HTTP-сессия
     * @return - данные текущего пользователя
     */
    @GetMapping("/whoAmI")
    public UserDTO whoAmI(HttpSession session) {
        return authService.whoAmI(session);
    }

    /**
     * завершает пользовательскую сессию, удаляя все данные авторизации
     *
     * @param session - текущая HTTP-сессия
     */
    @PostMapping("/logout")
    public void logout(HttpSession session) {
        session.invalidate();
    }
}