package ru.AuctionApp.Backend.Entity;

import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
@Table(name = "news")
public class News {
    /**
     * Id
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Long id;
    /**
     * Заголовок
     */
    private String title;
    /**
     * Содержимое новости
     */
    private String content;
    /**
     * Дата создания
     */
    private String creatingDate;
    /**
     * Автор
     */
    private String createdBy;
}