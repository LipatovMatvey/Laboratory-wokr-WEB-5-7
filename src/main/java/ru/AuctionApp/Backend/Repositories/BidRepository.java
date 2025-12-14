package ru.AuctionApp.Backend.Repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.AuctionApp.Backend.Entity.Auction;
import ru.AuctionApp.Backend.Entity.Bid;

import java.util.List;

public interface BidRepository extends JpaRepository<Bid, Long> {
    /**
     * Находит все ставки для указанного аукциона,
     * отсортированные по дате создания в порядке убывания
     * @param auction аукцион, для которого нужно найти ставки
     * @return список ставок
     */
    List<Bid> findByAuctionOrderByCreatedAtDesc(Auction auction);

    /**
     * Находит последнюю выигрышную ставку для указанного аукциона
     * @param auction аукцион, для которого нужно найти ставку
     * @return выигрышная ставка или null, если такой нет
     */
    Bid findTopByAuctionAndWinningTrueOrderByIdDesc(Auction auction);

    /**
     * Находит все невыигрышные ставки для указанного аукциона
     * @param auction аукцион, для которого нужно найти ставки
     * @return список невыигрышных ставок
     */
    List<Bid> findByAuctionAndWinningFalse(Auction auction);

    /**
     * Находит все ставки пользователя,
     * отсортированные по дате создания в порядке убывания
     * @param userId идентификатор пользователя
     * @return список ставок пользователя
     */
    List<Bid> findByUserIdOrderByCreatedAtDesc(Long userId);

    /**
     * Находит все выигрышные ставки пользователя,
     * отсортированные по дате создания в порядке убывания
     * @param userId идентификатор пользователя
     * @return список выигрышных ставок пользователя
     */
    List<Bid> findByUserIdAndWinningTrueOrderByCreatedAtDesc(Long userId);

    /**
     * Находит ставки по ID аукциона, отсортированные по убыванию суммы
     * @param auctionId ID аукциона
     * @return список ставок
     */
    List<Bid> findByAuctionIdOrderByAmountDesc(Long auctionId);

}