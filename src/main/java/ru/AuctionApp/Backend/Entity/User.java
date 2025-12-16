package ru.AuctionApp.Backend.Entity;

import jakarta.persistence.*;
import lombok.Data;

/**
 * Сущность User — представляет пользователя системы.
 */
@Data
@Entity
@Table(name = "users")
public class User {

    /**
     * Идентификатор пользователя
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Пароль пользователя
     */
    @Column(nullable = false)
    private String password;

    /**
     * Полное имя пользователя
     */
    private String fullName;

    /**
     * Почта пользователя
     */
    @Column(nullable = false, unique = true)
    private String email;

    /**
     * Дата рождения пользователя
     */
    private String birthDate;

    /**
     * Количество посещений пользователя
     */
    private int visits;

    /**
     * Статус блокировки
     */
    private boolean bannedStatus;

    /**
     * Роль пользователя
     */
    private String role;

    /**
     * Аватар пользователя
     */
    private String avatarPath;

    /**
     * Баланс пользователя
     */
    @Column(nullable = false)
    private double balance = 0.0;
}