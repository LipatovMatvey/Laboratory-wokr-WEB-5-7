package ru.AuctionApp.Backend.Entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "bids")
public class Bid {

    /**
     * Идентификатор ставки
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Аукцион, к которому относится ставка
     */
    @ManyToOne
    @JoinColumn(name = "auction_id", nullable = false)
    private Auction auction;

    /**
     * Пользователь, сделавший ставку
     */
    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /**
     * Размер ставки
     */
    @Column(nullable = false)
    private Double amount;

    /**
     * Дата и время создания ставки
     */
    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    /**
     * Флаг, указывающий является ли ставка выигрышной
     */
    @Column(nullable = false)
    private boolean winning = false;
}