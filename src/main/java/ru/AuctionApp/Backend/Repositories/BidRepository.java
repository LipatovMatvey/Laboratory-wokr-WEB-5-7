package ru.AuctionApp.Backend.Repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.AuctionApp.Backend.Entity.Auction;
import ru.AuctionApp.Backend.Entity.Bid;

import java.util.List;

public interface BidRepository extends JpaRepository<Bid, Long> {
    List<Bid> findByAuctionOrderByCreatedAtDesc(Auction auction);
    Bid findTopByAuctionAndWinningTrueOrderByIdDesc(Auction auction);
    List<Bid> findByAuctionAndWinningFalse(Auction auction);
    List<Bid> findByUserIdOrderByCreatedAtDesc(Long userId);
    List<Bid> findByUserIdAndWinningTrueOrderByCreatedAtDesc(Long userId);
}