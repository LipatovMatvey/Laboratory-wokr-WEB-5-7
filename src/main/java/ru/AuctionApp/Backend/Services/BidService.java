package ru.AuctionApp.Backend.Services;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.AuctionApp.Backend.Entity.*;
import ru.AuctionApp.Backend.Repositories.*;

import java.time.LocalDateTime;
import java.util.*;

@Service
@Transactional
public class BidService {

    /**
     * Репозиторий для работы со ставками
     */
    @Autowired
    private BidRepository bidRepository;

    /**
     * Репозиторий для работы с аукционами
     */
    @Autowired
    private AuctionRepository auctionRepository;

    /**
     * Репозиторий для работы с пользователями
     */
    @Autowired
    private UsersRepository usersRepository;

    /**
     * Размещает ставку на аукционе
     */
    public Map<String, Object> placeBid(Long userId, Long auctionId, Double amount) {
        User user = usersRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Пользователь не найден"));
        Auction auction = auctionRepository.findById(auctionId)
                .orElseThrow(() -> new RuntimeException("Аукцион не найден"));
        if (LocalDateTime.now().isBefore(auction.getStartTime())) {
            throw new RuntimeException("Аукцион еще не начался");
        }
        if (LocalDateTime.now().isAfter(auction.getEndTime()) ||
                !"ACTIVE".equals(auction.getStatus())) {
            throw new RuntimeException("Аукцион завершен");
        }
        Double minBid = (auction.getCurrentPrice() != null ?
                auction.getCurrentPrice() : auction.getStartPrice()) + auction.getStep();
        if (amount < minBid) {
            throw new RuntimeException("Ставка должна быть не менее " + minBid);
        }
        if (user.getBalance() < amount) {
            throw new RuntimeException("Недостаточно средств на балансе");
        }
        Bid bid = new Bid();
        bid.setAuction(auction);
        bid.setUser(user);
        bid.setAmount(amount);
        bid.setCreatedAt(LocalDateTime.now());
        bid.setWinning(true);
        Bid previousWinningBid = bidRepository.findTopByAuctionAndWinningTrueOrderByIdDesc(auction);
        if (previousWinningBid != null) {
            User previousUser = previousWinningBid.getUser();
            previousUser.setBalance(previousUser.getBalance() + previousWinningBid.getAmount());
            usersRepository.save(previousUser);
            previousWinningBid.setWinning(false);
            bidRepository.save(previousWinningBid);
        }
        user.setBalance(user.getBalance() - amount);
        usersRepository.save(user);
        bidRepository.save(bid);
        auction.setCurrentPrice(amount);
        auction.setBidsCount(auction.getBidsCount() + 1);
        if (LocalDateTime.now().isAfter(auction.getEndTime())) {
            auction.setStatus("FINISHED");
            auction.setWinner(user);
        }
        auctionRepository.save(auction);
        return Map.of(
                "success", true,
                "message", "Ставка успешно размещена",
                "newBalance", user.getBalance(),
                "newPrice", amount,
                "bidsCount", auction.getBidsCount()
        );
    }

    /**
     * Получает историю ставок для аукциона
     */
    public List<Map<String, Object>> getAuctionBids(Long auctionId) {
        Auction auction = auctionRepository.findById(auctionId)
                .orElseThrow(() -> new RuntimeException("Аукцион не найден"));
        List<Bid> bids = bidRepository.findByAuctionOrderByCreatedAtDesc(auction);
        List<Map<String, Object>> result = new ArrayList<>();
        for (Bid bid : bids) {
            Map<String, Object> bidData = new HashMap<>();
            bidData.put("id", bid.getId());
            bidData.put("amount", bid.getAmount());
            bidData.put("createdAt", bid.getCreatedAt());
            bidData.put("userName", bid.getUser().getFullName());
            bidData.put("isWinning", bid.isWinning());
            result.add(bidData);
        }
        return result;
    }

    /**
     * Завершает аукцион и назначает победителя
     */
    public void finishAuction(Long auctionId) {
        Auction auction = auctionRepository.findById(auctionId)
                .orElseThrow(() -> new RuntimeException("Аукцион не найден"));
        Bid winningBid = bidRepository.findTopByAuctionAndWinningTrueOrderByIdDesc(auction);
        if (winningBid != null) {
            auction.setWinner(winningBid.getUser());
            auction.setCurrentPrice(winningBid.getAmount());
        }

        auction.setStatus("FINISHED");
        auctionRepository.save(auction);
    }

    /**
     * Возвращает деньги всем участникам (кроме победителя) при завершении аукциона
     */
    public void refundAllBidsExceptWinner(Long auctionId) {
        Auction auction = auctionRepository.findById(auctionId)
                .orElseThrow(() -> new RuntimeException("Аукцион не найден"));
        Bid winningBid = bidRepository.findTopByAuctionAndWinningTrueOrderByIdDesc(auction);
        List<Bid> losingBids = bidRepository.findByAuctionAndWinningFalse(auction);
        for (Bid bid : losingBids) {
            User user = bid.getUser();
            user.setBalance(user.getBalance() + bid.getAmount());
            usersRepository.save(user);
        }
    }

    /**
     * Получает ставки пользователя
     */
    public List<Map<String, Object>> getUserBids(Long userId) {
        List<Bid> bids = bidRepository.findByUserIdOrderByCreatedAtDesc(userId);
        List<Map<String, Object>> result = new ArrayList<>();
        for (Bid bid : bids) {
            Map<String, Object> bidData = new HashMap<>();
            bidData.put("id", bid.getId());
            bidData.put("amount", bid.getAmount());
            bidData.put("createdAt", bid.getCreatedAt());
            bidData.put("auctionTitle", bid.getAuction().getTitle());
            bidData.put("auctionId", bid.getAuction().getId());
            bidData.put("isWinning", bid.isWinning());
            result.add(bidData);
        }
        return result;
    }

    /**
     * Получает выигранные лоты пользователя
     */
    public List<Map<String, Object>> getUserWonLots(Long userId) {
        List<Auction> wonAuctions = auctionRepository.findByWinnerIdAndStatusOrderByEndTimeDesc(userId, "FINISHED");
        System.out.println("Найдено завершенных аукционов для пользователя " + userId + ": " + wonAuctions.size());
        List<Map<String, Object>> result = new ArrayList<>();
        for (Auction auction : wonAuctions) {
            System.out.println("Аукцион: " + auction.getTitle() + ", статус: " + auction.getStatus() + ", победитель ID: " +
                    (auction.getWinner() != null ? auction.getWinner().getId() : "null"));
            if (auction.getWinner() != null && auction.getWinner().getId().equals(userId)) {
                Map<String, Object> lotData = new HashMap<>();
                lotData.put("id", auction.getId());
                lotData.put("auctionId", auction.getId());
                lotData.put("title", auction.getTitle());
                lotData.put("description", auction.getDescription());
                lotData.put("finalPrice", auction.getCurrentPrice());
                lotData.put("winDate", auction.getEndTime());
                lotData.put("imageUrl", auction.getImageUrl());
                lotData.put("category", auction.getCategory());
                result.add(lotData);
            }
        }
        System.out.println("Возвращаем " + result.size() + " выигранных лотов");
        return result;
    }
}