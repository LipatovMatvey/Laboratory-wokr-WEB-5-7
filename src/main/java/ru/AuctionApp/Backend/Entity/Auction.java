package ru.AuctionApp.Backend.Entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "auctions")
public class Auction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false)
    private String title;
    @Column(columnDefinition = "TEXT")
    private String description;
    @Column(nullable = false)
    private Double startPrice;
    @Column
    private Double currentPrice;
    @Column(nullable = false)
    private Double step;
    @Column(nullable = false)
    private LocalDateTime startTime;
    @Column(nullable = false)
    private LocalDateTime endTime;
    @Column
    private String imageUrl;
    @Column
    private String category;
    @Column
    private String status = "ACTIVE"; // ACTIVE, FINISHED, CANCELLED
    @Column
    private Integer bidsCount = 0;
    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
    @Column
    private LocalDateTime updatedAt;
    @ManyToOne
    @JoinColumn(name = "creator_id")
    private User creator;
    @ManyToOne
    @JoinColumn(name = "winner_id")
    private User winner;
}