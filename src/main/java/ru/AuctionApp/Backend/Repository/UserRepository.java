package ru.AuctionApp.Backend.Repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.AuctionApp.Backend.Entity.User;

import java.util.List;

// JpaRepository<КлассEntity, ТипPrimaryKey>
public interface UserRepository extends JpaRepository<User, Long> {

    // поиск по email
    User findByEmail(String email);
    User findByFullName(String fullName);

    List<User> findAllByOrderById();

    // проверка существования email
    boolean existsByEmail(String email);
    boolean existsByFullName(String fullName);
    boolean existsByEmailAndBannedStatusTrue(String email);
}