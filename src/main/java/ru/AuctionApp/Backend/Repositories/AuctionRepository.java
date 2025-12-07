package ru.AuctionApp.Backend.Repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.AuctionApp.Backend.Entity.Auction;
import java.time.LocalDateTime;
import java.util.List;

public interface AuctionRepository extends JpaRepository<Auction, Long> {
    /**
     * Ищет аукционы по статусу, отсортированные по дате создания (от новых к старым).
     *
     * @param status - статус аукциона ("ACTIVE", "FINISHED", "CANCELLED")
     * @return - список аукционов с указанным статусом
     */
    List<Auction> findByStatusOrderByCreatedAtDesc(String status);

    /**
     * Ищет аукционы по статусу, у которых время начала ещё не наступило.
     *
     * @param status - статус аукциона
     * @param now - текущее время
     * @return - список ещё не начавшихся аукционов
     */
    List<Auction> findByStatusAndEndTimeAfterOrderByEndTimeAsc(String status, LocalDateTime now);

    /**
     * Ищет аукционы, созданные конкретным пользователем.
     *
     * @param creatorId - идентификатор создателя
     * @return - список аукционов пользователя
     */
    List<Auction> findByCreatorIdOrderByCreatedAtDesc(Long creatorId);

    /**
     * Ищет аукционы по статусу, у которых время начала ещё не наступило.
     *
     * @param status - статус аукциона
     * @param now - текущее время
     * @return - список ещё не начавшихся аукционов
     */
    List<Auction> findByStatusAndStartTimeAfter(String status, LocalDateTime now);

    /**
     * Ищет аукционы по статусу, у которых время окончания уже наступило.
     *
     * @param status - статус аукциона
     * @param now - текущее время
     * @return - список завершенных аукционов
     */
    List<Auction> findByStatusAndEndTimeBefore(String status, LocalDateTime now);
}