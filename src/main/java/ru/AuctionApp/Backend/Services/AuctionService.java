// AuctionService.java
package ru.AuctionApp.Backend.Services;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import ru.AuctionApp.Backend.DTO.AuctionDTO;
import ru.AuctionApp.Backend.Entity.Auction;
import ru.AuctionApp.Backend.Entity.User;
import ru.AuctionApp.Backend.Repositories.AuctionRepository;
import ru.AuctionApp.Backend.Repositories.UsersRepository;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class AuctionService {

    @Autowired
    private AuctionRepository auctionRepository;

    @Autowired
    private UsersRepository usersRepository;

    public AuctionDTO createAuction(
            String title,
            String description,
            Double startPrice,
            Double step,
            LocalDateTime startTime,
            LocalDateTime endTime,
            String category,
            MultipartFile image,
            Long creatorId
    ) {
        if (endTime.isBefore(startTime)) {
            throw new RuntimeException("Время окончания не может быть раньше времени начала");
        }

        if (startTime.isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Время начала не может быть в прошлом");
        }

        Auction auction = new Auction();
        auction.setTitle(title);
        auction.setDescription(description);
        auction.setStartPrice(startPrice);
        auction.setCurrentPrice(startPrice);
        auction.setStep(step);
        auction.setStartTime(startTime);
        auction.setEndTime(endTime);
        auction.setCategory(category);
        auction.setStatus("ACTIVE");
        auction.setBidsCount(0);

        User creator = usersRepository.findById(creatorId)
                .orElseThrow(() -> new RuntimeException("Создатель не найден"));
        auction.setCreator(creator);

        auction.setImageUrl("/uploads/auctions/NOFOTO.jpg");

        if (image != null && !image.isEmpty()) {
            try {
                String fileName = UUID.randomUUID() + "_" + image.getOriginalFilename();
                Path uploadPath = Paths.get("uploads/auctions");

                if (!Files.exists(uploadPath)) {
                    Files.createDirectories(uploadPath);
                }

                Files.copy(
                        image.getInputStream(),
                        uploadPath.resolve(fileName),
                        StandardCopyOption.REPLACE_EXISTING
                );

                auction.setImageUrl("/uploads/auctions/" + fileName);
            } catch (IOException e) {
                e.printStackTrace();
                throw new RuntimeException("Ошибка сохранения изображения: " + e.getMessage());
            }
        }

        Auction saved = auctionRepository.save(auction);
        return new AuctionDTO(saved);
    }

    public List<AuctionDTO> getActiveAuctions() {
        LocalDateTime now = LocalDateTime.now();
        List<Auction> auctions = auctionRepository.findByStatusAndEndTimeAfterOrderByEndTimeAsc("ACTIVE", now);
        return auctions.stream().map(AuctionDTO::new).collect(Collectors.toList());
    }

    public AuctionDTO getAuctionById(Long id) {
        Auction auction = auctionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Аукцион не найден"));
        return new AuctionDTO(auction);
    }

    public List<AuctionDTO> getUserAuctions(Long userId) {
        List<Auction> auctions = auctionRepository.findByCreatorIdOrderByCreatedAtDesc(userId);
        return auctions.stream().map(AuctionDTO::new).collect(Collectors.toList());
    }
}