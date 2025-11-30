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

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false)
    private String password;
    private String fullName;
    @Column(nullable = false, unique = true)
    private String email;
    private String birthDate;

    private int visits;
    private boolean bannedStatus;
    private String role;
    private String avatarPath;
}