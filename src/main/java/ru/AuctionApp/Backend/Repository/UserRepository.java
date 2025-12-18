package ru.AuctionApp.Backend.Repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.AuctionApp.Backend.Entity.User;

import java.util.List;

public interface UserRepository extends JpaRepository<User, Long> {

    User findByEmail(String email);
    List<User> findAllByOrderById();

    boolean existsByEmail(String email);
    boolean existsByEmailAndBannedStatusTrue(String email);
}