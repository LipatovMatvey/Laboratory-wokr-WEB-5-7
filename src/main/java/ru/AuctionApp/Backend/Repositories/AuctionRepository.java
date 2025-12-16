package ru.AuctionApp.Backend.Repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;
import ru.AuctionApp.Backend.Entity.Auction;
import java.time.LocalDateTime;
import java.util.List;

public interface AuctionRepository extends JpaRepository<Auction, Long> {
    /**
     * Ищет аукционы по статусу, отсортированные по дате создания (от новых к старым).
     * @param status - статус аукциона ("ACTIVE", "FINISHED", "CANCELLED")
     * @return - список аукционов с указанным статусом
     */
    List<Auction> findByStatusOrderByCreatedAtDesc(String status);

    /**
     * Ищет аукционы по статусу, у которых время начала ещё не наступило.
     * @param status - статус аукциона
     * @param now - текущее время
     * @return - список ещё не начавшихся аукционов
     */
    List<Auction> findByStatusAndEndTimeAfterOrderByEndTimeAsc(String status, LocalDateTime now);

    /**
     * Ищет аукционы, созданные конкретным пользователем.
     * @param creatorId - идентификатор создателя
     * @return - список аукционов пользователя
     */
    List<Auction> findByCreatorIdOrderByCreatedAtDesc(Long creatorId);

    /**
     * Ищет аукционы по статусу, у которых время начала ещё не наступило.
     * @param status - статус аукциона
     * @param now - текущее время
     * @return - список ещё не начавшихся аукционов
     */
    List<Auction> findByStatusAndStartTimeAfter(String status, LocalDateTime now);

    /**
     * Ищет аукционы по статусу, у которых время окончания уже наступило.
     * @param status - статус аукциона
     * @param now - текущее время
     * @return - список завершенных аукционов
     */
    List<Auction> findByStatusAndEndTimeBefore(String status, LocalDateTime now);

    /**
     * Ищет аукционы по победителю и статусу
     * @param winnerId - ID победителя
     * @param status - статус аукциона
     * @return - список аукционов
     */
    List<Auction> findByWinnerIdAndStatusOrderByEndTimeDesc(Long winnerId, String status);

    /**
     * Ищет аукционы по нескольким статусам
     * @param statuses - список статусов
     * @return - список аукционов с указанными статусами
     */
    List<Auction> findByStatusIn(List<String> statuses);

    /**
     * Удаляет аукцион по ID (с каскадным удалением ставок)
     * @param id ID аукциона
     */
    @Modifying
    @Transactional
    @Query("DELETE FROM Auction a WHERE a.id = :id")
    void deleteByIdCustom(Long id);

    /**
     * Ищет завершенные аукционы (статусы FINISHED, EXPIRED, CANCELLED)
     * @return список завершенных аукционов
     */
    @Query("SELECT a FROM Auction a WHERE a.status IN ('FINISHED', 'EXPIRED', 'CANCELLED')")
    List<Auction> findCompletedAuctions();
}