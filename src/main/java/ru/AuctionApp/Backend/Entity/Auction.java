package ru.AuctionApp.Backend.Entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "auctions")
public class Auction {
    /**
     * Идентификатор аукциона
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    /**
     * Название аукциона
     */
    @Column(nullable = false)
    private String title;
    /**
     * Подробное описание лота
     */
    @Column(columnDefinition = "TEXT")
    private String description;
    /**
     * Начальная цена лота
     */
    @Column(nullable = false)
    private Double startPrice;
    /**
     * Текущая цена лота
     */
    @Column
    private Double currentPrice;
    /**
     * Минимальный шаг ставки
     */
    @Column(nullable = false)
    private Double step;
    /**
     * Время начала аукциона
     */
    @Column(nullable = false)
    private LocalDateTime startTime;
    /**
     * Время окончания аукциона
     */
    @Column(nullable = false)
    private LocalDateTime endTime;
    /**
     * URL-адрес изображения лота
     */
    @Column
    private String imageUrl;
    /**
     * Категория лота
     */
    @Column
    private String category;
    /**
     * Статус аукциона ("ACTIVE", "FINISHED", "CANCELLED")
     */
    @Column
    private String status = "ACTIVE";
    /**
     * Количество сделанных ставок
     */
    @Column
    private Integer bidsCount = 0;
    /**
     * Дата и время создания аукциона
     */
    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
    /**
     * Дата и время последнего обновления аукциона
     */
    @Column
    private LocalDateTime updatedAt;
    /**
     * Создатель аукциона
     */
    @ManyToOne
    @JoinColumn(name = "creator_id")
    private User creator;
    /**
     * Победитель аукциона
     */
    @ManyToOne
    @JoinColumn(name = "winner_id")
    private User winner;
}