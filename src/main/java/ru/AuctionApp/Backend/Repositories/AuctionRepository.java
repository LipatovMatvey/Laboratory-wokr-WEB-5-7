package ru.AuctionApp.Backend.Repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.AuctionApp.Backend.Entity.Auction;
import java.time.LocalDateTime;
import java.util.List;

public interface AuctionRepository extends JpaRepository<Auction, Long> {

    List<Auction> findByStatusOrderByCreatedAtDesc(String status);

    List<Auction> findByStatusAndEndTimeAfterOrderByEndTimeAsc(String status, LocalDateTime now);

    List<Auction> findByCreatorIdOrderByCreatedAtDesc(Long creatorId);

    List<Auction> findByStatusAndStartTimeAfter(String status, LocalDateTime now);

    List<Auction> findByStatusAndEndTimeBefore(String status, LocalDateTime now);
}