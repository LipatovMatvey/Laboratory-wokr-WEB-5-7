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
    /**
     * Флаг, указывающий, авторизован ли пользователь
     */
    private boolean authenticated;

    /**
     * Идентификатор пользователя
     */
    private Long id;

    /**
     * Полное имя пользователя
     */
    private String fullName;

    /**
     * Электронная почта пользователя
     */
    private String email;

    /**
     * Количество посещений пользователя
     */
    private int visits;

    /**
     * Роль пользователя ("admin", "moder", "user", "guest")
     */
    private String role;

    /**
     * URL-адрес аватара пользователя
     */
    private String avatarUrl;

    /**
     * Дата рождения пользователя
     */
    private String birthdate;

    /**
     * Статус блокировки пользователя
     */
    private boolean bannedStatus;

    /**
     * Баланс пользователя
     */
    private double balance;

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
        this.balance = u.getBalance();
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
        this.balance = 0.0;
    }
}