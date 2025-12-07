package ru.AuctionApp.Backend.Repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.AuctionApp.Backend.Entity.User;

import java.util.List;


public interface UsersRepository extends JpaRepository<User, Long> {

    /**
     * Ищет пользователя по email.
     *
     * @param email - электронная почта пользователя
     * @return - пользователь или null, если не найден
     */
    User findByEmail(String email);

    /**
     * Ищет пользователя по полному имени.
     *
     * @param fullName - ФИО пользователя
     * @return - пользователь или null, если не найден
     */
    User findByFullName(String fullName);

    /**
     * Возвращает всех пользователей, отсортированных по ID.
     *
     * @return - список всех пользователей, упорядоченный по возрастанию ID
     */
    List<User> findAllByOrderById();

    /**
     * Проверяет существование пользователя с указанным email.
     *
     * @param email - электронная почта для проверки
     * @return - true, если пользователь существует, иначе false
     */
    boolean existsByEmail(String email);

    /**
     * Проверяет существование пользователя с указанным полным именем.
     *
     * @param fullName - ФИО для проверки
     * @return - true, если пользователь существует, иначе false
     */
    boolean existsByFullName(String fullName);

    /**
     * Проверяет существование заблокированного пользователя с указанным email.
     *
     * @param email - электронная почта для проверки
     * @return - true, если заблокированный пользователь существует, иначе false
     */
    boolean existsByEmailAndBannedStatusTrue(String email);
}