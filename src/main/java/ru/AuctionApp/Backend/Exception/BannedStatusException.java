package ru.AuctionApp.Backend.Exception;

public class BannedStatusException extends RuntimeException {
    public BannedStatusException(String message) { super(message); }
}
