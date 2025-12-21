$(document).ready(function() {
    checkAuth();
    const auctionId = getAuctionIdFromUrl();
    if (auctionId) {
        loadAuctionDetails(auctionId);
        loadBidsHistory(auctionId);
        startTimeUpdate();
    } else {
        showUserNotification('Аукцион не найден', 'danger');
        setTimeout(() => window.location.href = 'auctions.html', 2000);
    }
});

let currentAuction = null;
let userData = null;
let timeUpdateInterval = null;

/**
 * Получает ID аукциона из URL
 */
function getAuctionIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

/**
 * Проверяет авторизацию пользователя
 */
function checkAuth() {
    const userStr = localStorage.getItem('user');
    if (userStr) {
        userData = JSON.parse(userStr);
        if (userData.authenticated) {
            $('#login-required-message').hide();
            loadUserBalance();
            if (currentAuction) {
                setupBidForm(currentAuction);
            }
        } else {
            $('#login-required-message').show();
            $('#bid-form').hide();
        }
    } else {
        $('#login-required-message').show();
        $('#bid-form').hide();
    }
}

/**
 * Загружает детали аукциона
 */
function loadAuctionDetails(auctionId) {
    $.ajax({
        url: `/api/auctions/${auctionId}`,
        method: "GET",
        success: function(auction) {
            currentAuction = auction;
            renderAuctionDetails(auction);
            setupBidForm(auction);
        },
        error: function(xhr) {
            showUserNotification('Не удалось загрузить данные аукциона', 'danger');
        }
    });
}

/**
 * Отображает детали аукциона
 */
function renderAuctionDetails(auction) {
    $('#auction-title').text(auction.title);
    $('#auction-description').text(auction.description || 'Описание отсутствует');
    $('#current-price').text(formatPrice(auction.currentPrice || auction.startPrice) + ' ₽');
    $('#start-price').text(formatPrice(auction.startPrice) + ' ₽');
    $('#step').text(formatPrice(auction.step) + ' ₽');
    $('#min-step').text(formatPrice(auction.step));
    $('#bids-count').text(auction.bidsCount || 0);
    $('#creator-name').text(auction.creatorName || 'Неизвестно');
    const startTime = new Date(auction.startTime);
    const endTime = new Date(auction.endTime);
    $('#start-time').text(startTime.toLocaleString('ru-RU'));
    $('#end-time').text(endTime.toLocaleString('ru-RU'));
    $('#start-time-text').text(startTime.toLocaleString('ru-RU'));
    const status = getAuctionStatus(auction);
    $('#auction-status').text(status.text).addClass(status.class);
    const imageUrl = auction.imageUrl || '/uploads/auctions/NOFOTO.jpg';
    $('#auction-image').attr('src', imageUrl).on('error', function() {
        $(this).attr('src', '/uploads/auctions/NOFOTO.jpg');
    });
    updateTimeLeft(auction);
}

/**
 * Определяет статус аукциона
 */
function getAuctionStatus(auction) {
    const now = new Date();
    const startTime = new Date(auction.startTime);
    const endTime = new Date(auction.endTime);
    if (auction.status === 'FINISHED' || auction.status === 'CANCELLED') {
        return { text: 'Завершен', class: 'bg-danger' };
    }
    if (now < startTime) {
        return { text: 'Ожидает начала', class: 'bg-warning text-dark' };
    }
    if (now >= startTime && now <= endTime) {
        return { text: 'Активен', class: 'bg-success' };
    }
    if (now > endTime) {
        return { text: 'Завершен', class: 'bg-danger' };
    }
    return { text: 'Неизвестно', class: 'bg-secondary' };
}

/**
 * Настраивает форму ставки
 */
function setupBidForm(auction) {
    const now = new Date();
    const startTime = new Date(auction.startTime);
    const endTime = new Date(auction.endTime);
    if (now < startTime) {
        $('#auction-not-started').show();
        $('#bid-form').hide();
        return;
    }
    if (now > endTime || auction.status === 'FINISHED' || auction.status === 'CANCELLED') {
        $('#auction-ended').show();
        $('#bid-form').hide();
        return;
    }
    if (!userData || !userData.authenticated) {
        $('#login-required-message').show();
        $('#bid-form').hide();
        return;
    }
    $('#bid-form').show();
    const minBid = (auction.currentPrice || auction.startPrice) + auction.step;
    $('#bid-amount').attr('min', minBid).val(minBid);
    $('#place-bid-btn').off('click').on('click', function() {
        placeBid(auction.id);
    });
    $('#confirm-bid-btn').off('click').on('click', function() {
        confirmPlaceBid(auction.id);
    });
}

/**
 * Размещает ставку
 */
function placeBid(auctionId) {
    const bidAmount = parseFloat($('#bid-amount').val());
    const minBid = (currentAuction.currentPrice || currentAuction.startPrice) + currentAuction.step;    
    if (!bidAmount || bidAmount < minBid) {
        showUserNotification(`Минимальная ставка: ${formatPrice(minBid)} ₽`, 'warning');
        return;
    }    
    if (!userData || !userData.authenticated) {
        showUserNotification('Для размещения ставки необходимо войти в систему', 'warning');
        return;
    }    
    if (userData.balance < bidAmount) {
        showUserNotification(`Недостаточно средств! Ваш баланс: ${formatPrice(userData.balance)} ₽, требуется: ${formatPrice(bidAmount)} ₽`, 'danger');
        return;
    }    
    $('#confirm-bid-amount').text(formatPrice(bidAmount));
    const modal = new bootstrap.Modal(document.getElementById('confirmBidModal'));
    modal.show();
}

/**
 * Подтверждает ставку
 */
function confirmPlaceBid(auctionId) {
    const bidAmount = parseFloat($('#bid-amount').val());
    $.ajax({
        url: `/api/bids`,
        method: "POST",
        contentType: "application/json",
        data: JSON.stringify({
            auctionId: auctionId,
            amount: bidAmount
        }),
        success: function(response) {
            $('#confirmBidModal').modal('hide');
            showUserNotification('Ставка успешно размещена!', 'success');
            loadAuctionDetails(auctionId);
            loadBidsHistory(auctionId);
            loadUserBalance();
        },
        error: function(xhr) {
            const error = xhr.responseJSON?.error || 'Ошибка при размещении ставки';
            showUserNotification(error, 'danger');
        }
    });
}

/**
 * Загружает историю ставок
 */
function loadBidsHistory(auctionId) {
    $.ajax({
        url: `/api/bids/auction/${auctionId}`,
        method: "GET",
        success: function(bids) {
            renderBidsHistory(bids);
        },
        error: function() {
        }
    });
}

/**
 * Отображает историю ставок
 */
function renderBidsHistory(bids) {
    const $container = $('#bids-history');
    if (!bids || bids.length === 0) {
        $container.html('<p class="text-muted text-center py-3">Ставок пока нет</p>');
        return;
    }
    let html = '';
    bids.forEach(bid => {
        const time = new Date(bid.createdAt).toLocaleString('ru-RU');
        const isWinning = bid.isWinning ? '<span class="badge bg-success ms-2">Лидирует</span>' : '';
        html += `
            <div class="bid-item mb-2 pb-2 border-bottom">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <strong>${bid.userName || 'Аноним'}</strong>
                        ${isWinning}
                        <br>
                        <small class="text-muted">${time}</small>
                    </div>
                    <div class="text-end">
                        <strong class="text-primary">${formatPrice(bid.amount)} ₽</strong>
                    </div>
                </div>
            </div>
        `;
    });
    $container.html(html);
}

/**
 * Загружает баланс пользователя
 */
function loadUserBalance(callback) {
    if (!userData || !userData.authenticated) {
        if (callback) callback();
        return;
    }
    $.ajax({
        url: "/api/balance",
        method: "GET",
        success: function(response) {
            userData.balance = response.balance;
            $('#user-balance').text(formatPrice(response.balance));
            localStorage.setItem('user', JSON.stringify(userData));
            if (callback) callback();
        },
        error: function() {
            if (userData.balance !== undefined) {
                $('#user-balance').text(formatPrice(userData.balance));
            }
            if (callback) callback();
        }
    });
}

/**
 * Обновляет оставшееся время
 */
function startTimeUpdate() {
    if (timeUpdateInterval) clearInterval(timeUpdateInterval);
    timeUpdateInterval = setInterval(() => {
        if (currentAuction) {
            updateTimeLeft(currentAuction);
        }
    }, 1000);
}

/**
 * Обновляет отображение оставшегося времени
 */
function updateTimeLeft(auction) {
    const endTime = new Date(auction.endTime);
    const now = new Date();
    const diff = endTime - now;
    if (diff <= 0) {
        $('#time-left').text('Завершен').addClass('text-danger');
        clearInterval(timeUpdateInterval);
        if ($('#bid-form').is(':visible')) {
            $('#bid-form').hide();
            $('#auction-ended').show();
        }
        return;
    }
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    let timeText = '';
    if (days > 0) timeText = `${days}д ${hours}ч`;
    else if (hours > 0) timeText = `${hours}ч ${minutes}м`;
    else timeText = `${minutes}м ${seconds}с`;
    $('#time-left').text(timeText);
    if (days === 0 && hours < 1) {
        $('#time-left').removeClass('text-success text-warning').addClass('text-danger');
    } else if (days === 0 && hours < 24) {
        $('#time-left').removeClass('text-success text-danger').addClass('text-warning');
    } else {
        $('#time-left').removeClass('text-warning text-danger').addClass('text-success');
    }
}

/**
 * Форматирует цену
 */
function formatPrice(price) {
    return parseFloat(price).toLocaleString('ru-RU', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

/**
 * Показывает уведомление пользователю в правом верхнем углу.
 * @param {string} message - Текст сообщения
 * @param {string} type - Тип уведомления (success, danger, warning, info)
 */
function showUserNotification(message, type = 'info') {
    $('.user-notification').remove();
    
    const alertClass = type === 'success' ? 'alert-success' : 
                      type === 'danger' ? 'alert-danger' : 
                      type === 'warning' ? 'alert-warning' : 'alert-info';
    const $notification = $(`
        <div class="alert ${alertClass} alert-dismissible fade show user-notification" role="alert" 
             style="position: fixed; top: 80px; right: 20px; z-index: 9999; min-width: 300px; max-width: 400px;">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `);
    $('body').append($notification);
    
    setTimeout(() => {
        $notification.fadeOut(300, function () {
            $(this).remove();
        });
    }, 3000);
}

/**
 * Запрашивает время сервера
 */
function updateServerTime() {
    $.ajax({
        url: "/api/time",
        method: "GET",
        success: function(data) {
            $("#server-time").text("Точное московское время: " + data.time);
        }
    });
}
setInterval(updateServerTime, 1000);
updateServerTime();