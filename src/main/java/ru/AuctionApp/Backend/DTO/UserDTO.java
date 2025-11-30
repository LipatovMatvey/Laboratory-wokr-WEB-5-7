package ru.AuctionApp.Backend.DTO;

import lombok.Data;
import ru.AuctionApp.Backend.Entity.User;

/**
 * DTO (Data Transfer Object) для передачи данных о пользователе на клиент.
 * Используется контроллерами авторизации, для профиля, управления пользователями
 * и в механизме проверки сессии (whoAmI).
 */
@Data
public class UserDTO {
    private boolean authenticated;
    private Long id;
    private String fullName;
    private String email;
    private int visits;
    private String role;
    private String avatarUrl;
    private String birthdate;
    private boolean bannedStatus;

    /**
     * Конструктор с параметром
     * @param u Пользователь
     */
    public UserDTO(User u) {
        this.authenticated = true;
        this.id = u.getId();
        this.fullName = u.getFullName();
        this.email = u.getEmail();
        this.visits = u.getVisits();
        this.role = u.getRole();
        this.avatarUrl = u.getAvatarPath();
        this.birthdate = u.getBirthDate();
        this.bannedStatus = u.isBannedStatus();
    }

    /**
     * Конструктор по умолчанию
     */
    public UserDTO() {
        this.authenticated = false;
        this.id = null;
        this.fullName = null;
        this.email = null;
        this.visits = 0;
        this.role = "guest";
    }
}