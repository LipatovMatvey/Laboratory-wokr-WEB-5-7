$(document).ready(function() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!user.authenticated) {
        updateNavigation({ authenticated: false });
    }
    checkAuth();
    $('#logout-btn').on('click', function() {
        logout();
    });
    loadAuctions();
    $('#auction-filters button').on('click', function() {
        const filter = $(this).data('filter');
        $('#auction-filters button').removeClass('active');
        $(this).addClass('active');
        filterAuctions(filter);
    });
});

/**
 * Запрашивает у сервера текущее московское время
 * и отображает его в элементе #server-time.
 * @returns {undefined}
 */
function updateServerTime() {
    $.ajax({
        url: "/api/time",
        method: "GET",
        success: function (data) {
            $("#server-time").text("Точное московское время: " + data.time);
        }
    });
}
setInterval(updateServerTime, 1000);
updateServerTime();

/**
 * Проверяет авторизацию пользователя и обновляет UI
 * @returns {void}
 */
function checkAuth() {
    $.ajax({
        url: "/auth/whoAmI",
        method: "GET",
        success: function(response) {
            updateNavigation(response);
        },
        error: function(xhr, status, error) {
            updateNavigation({ authenticated: false });
        }
    });
}

/**
 * Обновляет навигацию на основе данных пользователя
 * @param {Object} response - Объект с данными пользователя
 * @param {boolean} response.authenticated - Статус авторизации
 * @param {string} response.fullName - Полное имя пользователя
 * @param {string} response.role - Роль пользователя
 * @returns {void}
 */
function updateNavigation(response) {
    if (response.authenticated) {
        $('#user-info').text(response.fullName || 'Пользователь');
        $('#user-role').text(getRoleDisplayName(response.role));
        $('#user-visits').text("Количество посещений " + `${response.visits || 0}`);
        $('#login-item').addClass('hidden');
        $('#logout-item').removeClass('hidden');
        $('#user-cabinet-item').removeClass('hidden');
        const userData = {
            authenticated: true,
            id: response.id,
            fullName: response.fullName,
            email: response.email,
            visits: response.visits,
            birthdate: response.birthdate,
            role: response.role,
            avatarUrl: response.avatarUrl,
            balance: response.balance || 0
        };
        localStorage.setItem('user', JSON.stringify(userData));
        if (response.role === 'admin') {
            $('#create-auction-btn').removeClass('hidden');
        } else {
            $('#create-auction-btn').addClass('hidden');
        }
    } else {
        $('#user-info').text('');
        $('#user-role').text('Гость');
        $('#user-visits').html('');
        $('#login-item').removeClass('hidden');
        $('#logout-item').addClass('hidden');
        $('#user-cabinet-item').addClass('hidden');
        $('#create-auction-btn').addClass('hidden');
        localStorage.setItem('user', JSON.stringify({ authenticated: false }));
    }
}

/**
 * Возвращает читаемое название роли
 * @param {string} role - Код роли (admin, moder, user)
 * @returns {string} Отображаемое название роли
 */
function getRoleDisplayName(role) {
    switch(role) {
        case 'admin': return 'Администратор';
        case 'moder': return 'Модератор';
        case 'user': return 'Пользователь';
        default: return 'Гость';
    }
}

/**
 * Выполняет выход пользователя из системы
 * @returns {void}
 */
function logout() {
    $.ajax({
        url: "/auth/logout",
        method: "POST",
        success: function() {
            localStorage.removeItem('user');
            window.location.reload();
        },
        error: function() {
            localStorage.removeItem('user');
            window.location.reload();
        }
    });
}

/**
 * Загружает активные аукционы с сервера
 * @returns {void}
 */
function loadAuctions() {
    $.ajax({
        url: "/api/auctions/active",
        method: "GET",
        success: function(auctions) {
            window.allAuctions = auctions;
            renderAuctions(auctions);
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            if (user.role === 'admin') {
                $('#create-auction-btn').removeClass('hidden');
            }
        },
        error: function(xhr) {
            $('#auctions-list').html(`
                <div class="col-12 text-center">
                    <p class="text-danger">Ошибка загрузки аукционов</p>
                    <button onclick="loadAuctions()" class="btn btn-sm btn-outline-secondary mt-2">
                        <i class="bi bi-arrow-clockwise me-1"></i>Повторить попытку
                    </button>
                </div>
            `);
        }
    });
}

/**
 * Загружает завершенные аукционы с сервера
 * @returns {void}
 */
function loadCompletedAuctions() {
    $.ajax({
        url: "/api/auctions/completed",
        method: "GET",
        success: function(auctions) {
            renderCompletedAuctions(auctions);
        },
        error: function(xhr) {
            $('#auctions-list').html(`
                <div class="col-12 text-center">
                    <p class="text-danger">Ошибка загрузки завершенных аукционов</p>
                    <button onclick="loadCompletedAuctions()" class="btn btn-sm btn-outline-secondary mt-2">
                        <i class="bi bi-arrow-clockwise me-1"></i>Повторить попытку
                    </button>
                </div>
            `);
        }
    });
}

/**
 * Отображает список активных аукционов в контейнере
 * @param {Array<Object>} auctions - Массив объектов аукционов
 * @returns {void}
 */
function renderAuctions(auctions) {
    const $container = $('#auctions-list');
    if (!auctions || auctions.length === 0) {
        $container.html(`
            <div class="col-12 text-center py-5">
                <div class="mb-3">
                    <i class="bi bi-binoculars" style="font-size: 3rem; color: #6c757d;"></i>
                </div>
                <p class="text-muted mb-2">Активные аукционы отсутствуют</p>
                <p class="text-muted small">Попробуйте изменить фильтр или вернитесь позже</p>
            </div>
        `);
        return;
    }
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const isAdmin = user.authenticated && user.role === 'admin';
    const now = new Date();
    let html = '';
    auctions.forEach(auction => {
        const timeLeft = calculateTimeLeft(auction.endTime);
        const timeClass = getTimeClass(timeLeft);
        const isNew = isAuctionNew(auction.createdAt);
        const endTime = new Date(auction.endTime);
        const isEnded = now > endTime || auction.status === 'FINISHED' || auction.status === 'CANCELLED';
        const adminButtons = isAdmin && !isEnded ? `
            <div class="btn-group btn-group-sm w-100 mt-2" role="group">
                <button type="button" class="btn btn-outline-warning edit-auction-btn"
                        data-auction-id="${auction.id}">
                    <i class="bi bi-pencil me-1"></i>Редактировать
                </button>
                <button type="button" class="btn btn-outline-success finish-auction-btn"
                        data-auction-id="${auction.id}" data-auction-title="${auction.title}">
                    <i class="bi bi-check-circle me-1"></i>Завершить
                </button>
            </div>
        ` : '';

        const badge = isNew ? '<span class="badge bg-success me-2"><i class="bi bi-star-fill me-1"></i>Новый</span>' : '';
        const creatorBadge = auction.creatorName ? `<span class="badge bg-secondary me-2"><i class="bi bi-person me-1"></i>${auction.creatorName}</span>` : '';
        html += `
            <div class="col-md-6 col-lg-4 mb-4" data-auction-id="${auction.id}" data-is-new="${isNew}" data-time-left="${timeLeft}">
                <div class="card h-100 auction-card shadow-sm">
                    <div class="position-relative">
                        <img src="${auction.imageUrl || '/uploads/auctions/NOFOTO.jpg'}"
                            class="card-img-top" alt="${auction.title}"
                            style="height: 200px; object-fit: cover;"
                            onerror="this.onerror=null; this.src='/uploads/auctions/NOFOTO.jpg'">
                        ${isNew ? `
                            <div class="position-absolute top-0 start-0 m-2">
                                <span class="badge bg-success">Новый</span>
                            </div>
                        ` : ''}
                        ${isAdmin ? `
                            <div class="position-absolute top-0 end-0 m-2">
                                <span class="badge ${auction.status === 'ACTIVE' ? 'bg-success' : 'bg-warning'}">
                                    ${auction.status === 'ACTIVE' ? 'Активен' : auction.status}
                                </span>
                            </div>
                        ` : ''}
                    </div>
                    <div class="card-body d-flex flex-column">
                        <h5 class="card-title">
                            ${badge}
                            ${auction.title}
                        </h5>
                        <p class="card-text flex-grow-1 text-muted small">${auction.description ? (auction.description.length > 100 ? auction.description.substring(0, 100) + '...' : auction.description) : 'Описание отсутствует'}</p>
                        <div class="mt-auto">
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <span class="fw-bold text-primary fs-5">${formatPrice(auction.currentPrice || auction.startPrice || 0)} ₽</span>
                                <small class="text-muted">Начальная: ${formatPrice(auction.startPrice || 0)} ₽</small>
                            </div>
                            <div class="d-flex justify-content-between align-items-center mb-3">
                                <small class="text-muted">
                                    <i class="bi bi-gem me-1"></i>Ставок: ${auction.bidsCount || 0}
                                </small>
                                <small class="${timeClass} fw-bold">
                                    <i class="bi bi-clock me-1"></i>${timeLeft}
                                </small>
                            </div>
                            <div class="d-grid">
                                ${getAuctionButton(auction)}
                            </div>
                            ${adminButtons}
                        </div>
                    </div>
                    <div class="card-footer bg-transparent border-top-0 pt-0">
                        <div class="d-flex justify-content-between align-items-center">
                            <small class="text-muted">
                                <i class="bi bi-tag me-1"></i>${getCategoryName(auction.category)}
                            </small>
                            <small class="text-muted">
                                <i class="bi bi-calendar me-1"></i>${formatDate(auction.createdAt)}
                            </small>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    $container.html(html);
    if (isAdmin) {
        setupAdminButtons();
    }
}

/**
 * Настраивает обработчики для кнопок администрирования
 */
function setupAdminButtons() {
    $('.edit-auction-btn').on('click', function(e) {
        e.stopPropagation();
        const auctionId = $(this).data('auction-id');
        editAuction(auctionId);
    });
    $('.finish-auction-btn').on('click', function(e) {
        e.stopPropagation();
        const auctionId = $(this).data('auction-id');
        const auctionTitle = $(this).data('auction-title');
        showConfirmDialog(
            'Завершение аукциона',
            `Вы уверены, что хотите завершить аукцион "${auctionTitle}" прямо сейчас?`,
            function() {
                finishAuction(auctionId, auctionTitle);
            }
        );
    });
}

/**
 * Завершает аукцион администратором
 */
function finishAuction(auctionId, auctionTitle) {
    $.ajax({
        url: `/api/bids/finish-auction/${auctionId}`,
        method: 'POST',
        success: function(response) {
            showUserNotification('Аукцион успешно завершен. Победитель определен.', 'success');
            loadAuctions();
        },
        error: function(xhr) {
            const error = xhr.responseJSON?.error || 'Ошибка при завершении аукциона';
            showUserNotification(error, 'danger');
        }
    });
}

/**
 * Редактирует аукцион
 */
function editAuction(auctionId) {
    window.location.href = `edit-auction.html?id=${auctionId}`;
}

/**
 * Отображает список завершенных аукционов
 * @param {Array<Object>} auctions - Массив завершенных аукционов
 * @returns {void}
 */
function renderCompletedAuctions(auctions) {
    const $container = $('#auctions-list');
    if (!auctions || auctions.length === 0) {
        $container.html(`
            <div class="col-12 text-center py-5">
                <div class="mb-3">
                    <i class="bi bi-check-circle" style="font-size: 3rem; color: #6c757d;"></i>
                </div>
                <p class="text-muted mb-2">Завершенные аукционы отсутствуют</p>
            </div>
        `);
        return;
    }
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const isAdmin = user.authenticated && user.role === 'admin';
    let html = '';
    auctions.forEach(auction => {
        const endTime = new Date(auction.endTime);
        const statusClass = auction.status === 'FINISHED' ? 'badge bg-success' :
                          auction.status === 'EXPIRED' ? 'badge bg-warning' :
                          auction.status === 'CANCELLED' ? 'badge bg-danger' : 'badge bg-secondary';
        const statusText = auction.status === 'FINISHED' ? 'Завершен' :
                          auction.status === 'EXPIRED' ? 'Истек без ставок' :
                          auction.status === 'CANCELLED' ? 'Отменен' : 'Неизвестно';
        const hasWinner = auction.status === 'FINISHED' && auction.winnerName;
        const winnerInfo = hasWinner ?
            `<small class="text-muted d-block mt-1"><i class="bi bi-trophy me-1"></i>Победитель: ${auction.winnerName || 'Неизвестен'}</small>` : '';
        const deleteButton = isAdmin ? `
            <button type="button" class="btn btn-sm btn-outline-danger mt-2 delete-auction-btn"
                    data-auction-id="${auction.id}"
                    data-auction-title="${auction.title}">
                <i class="bi bi-trash me-1"></i>Удалить
            </button>
        ` : '';
        html += `
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="card h-100">
                    <img src="${auction.imageUrl || '/uploads/auctions/NOFOTO.jpg'}"
                         class="card-img-top" alt="${auction.title}"
                         style="height: 150px; object-fit: cover;"
                         onerror="this.onerror=null; this.src='/uploads/auctions/NOFOTO.jpg'">
                    <div class="card-body">
                        <h5 class="card-title">${auction.title}</h5>
                        <div class="d-flex justify-content-between mb-2">
                            <span class="${statusClass}">${statusText}</span>
                            <small class="text-muted">${endTime.toLocaleDateString('ru-RU')}</small>
                        </div>
                        <p class="card-text small text-muted">
                            ${auction.description ? (auction.description.substring(0, 60) + '...') : 'Нет описания'}
                        </p>
                        ${winnerInfo}
                        <div class="d-flex justify-content-between align-items-center mt-2">
                            <strong class="text-success">${formatPrice(auction.currentPrice || auction.startPrice || 0)} ₽</strong>
                            <small class="text-muted">Ставок: ${auction.bidsCount || 0}</small>
                        </div>
                    </div>
                    <div class="card-footer bg-transparent">
                        <div class="d-grid gap-2">
                            <a href="auction-detail.html?id=${auction.id}" class="btn btn-sm btn-outline-primary">
                                Посмотреть детали
                            </a>
                            ${deleteButton}
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    $container.html(html);
    if (isAdmin) {
        $('.delete-auction-btn').on('click', function() {
            const auctionId = $(this).data('auction-id');
            const auctionTitle = $(this).data('auction-title');
            showConfirmDialog(
                'Удаление аукциона',
                `Вы уверены, что хотите удалить аукцион "${auctionTitle}"? Это действие нельзя отменить.`,
                function() {
                    deleteCompletedAuction(auctionId, auctionTitle);
                }
            );
        });
    }
}

/**
 * Удаляет завершенный аукцион
 */
function deleteCompletedAuction(auctionId, auctionTitle) {
    $.ajax({
        url: `/api/auctions/${auctionId}`,
        method: 'DELETE',
        success: function(response) {
            showUserNotification('Аукцион успешно удален', 'success');
            // Перезагружаем список завершенных аукционов
            loadCompletedAuctions();
        },
        error: function(xhr) {
            const error = xhr.responseJSON?.error || 'Ошибка при удалении аукциона';
            showUserNotification(error, 'danger');
        }
    });
}

/**
 * Возвращает соответствующую кнопку для аукциона в зависимости от авторизации
 * @param {Object} auction - Объект аукциона
 * @returns {string} HTML кнопки
 */
function getAuctionButton(auction) {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const endTime = new Date(auction.endTime);
    const now = new Date();
    const isEnded = now > endTime || auction.status === 'FINISHED' || auction.status === 'CANCELLED';
    if (isEnded) {
        return `
            <a href="auction-detail.html?id=${auction.id}" class="btn btn-secondary">
                <i class="bi bi-eye me-1"></i>Посмотреть
            </a>
        `;
    }
    if (user.authenticated) {
        return `
            <a href="auction-detail.html?id=${auction.id}" class="btn btn-primary">
                <i class="bi bi-cash-stack me-1"></i>Сделать ставку
            </a>
        `;
    } else {
        return `
            <a href="auth.html" class="btn btn-primary">
                <i class="bi bi-box-arrow-in-right me-1"></i>Войти для ставки
            </a>
        `;
    }
}

/**
 * Форматирует цену
 * @param {number} price - Цена
 * @returns {string} Отформатированная цена
 */
function formatPrice(price) {
    return parseFloat(price).toLocaleString('ru-RU', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

/**
 * Форматирует дату
 * @param {string} dateString - Дата в строковом формате
 * @returns {string} Отформатированная дата
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

/**
 * Возвращает название категории
 * @param {string} category - Код категории
 * @returns {string} Название категории
 */
function getCategoryName(category) {
    const categories = {
        'electronics': 'Электроника',
        'clothing': 'Одежда',
        'books': 'Книги',
        'collectibles': 'Коллекционные',
        'art': 'Искусство',
        'other': 'Другое'
    };
    return categories[category] || 'Не указано';
}

/**
 * Определяет CSS класс для времени в зависимости от срока
 * @param {string} timeLeft - Оставшееся время
 * @returns {string} CSS класс
 */
function getTimeClass(timeLeft) {
    if (timeLeft.includes('Завершен')) return 'text-danger';
    if (timeLeft.includes('час') || timeLeft.includes('час')) return 'text-warning';
    if (timeLeft.includes('день')) return 'text-success';
    return 'text-success';
}

/**
 * Фильтрует аукционы по выбранному критерию
 * @param {string} filter - Критерий фильтрации ('all', 'new', 'completed')
 * @returns {void}
 */
function filterAuctions(filter) {
    let filteredAuctions = [...window.allAuctions];
    switch(filter) {
        case 'new':
            filteredAuctions = filteredAuctions.filter(auction => isAuctionNew(auction.createdAt));
            break;
        case 'completed':
            loadCompletedAuctions();
            return;
        case 'all':
        default:
            break;
    }
    if (filter !== 'completed') {
        renderAuctions(filteredAuctions);
    }
}

/**
 * Рассчитывает оставшееся время до окончания аукциона
 * @param {string} endTime - Время окончания аукциона в формате ISO
 * @returns {string} Текстовое представление оставшегося времени
 */
function calculateTimeLeft(endTime) {
    const end = new Date(endTime);
    const now = new Date();
    const diff = end - now;
    if (diff <= 0) return 'Завершен';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (days > 0) return `${days} д ${hours} ч`;
    if (hours > 0) return `${hours} ч ${minutes} мин`;
    if (minutes > 0) return `${minutes} мин`;
    return 'Менее минуты';
}

/**
 * Проверяет, является ли аукцион новым (создан менее 7 дней назад)
 * @param {string} createdAt - Дата создания аукциона в формате ISO
 * @returns {boolean} true если аукцион новый
 */
function isAuctionNew(createdAt) {
    const created = new Date(createdAt);
    const now = new Date();
    const diffDays = (now - created) / (1000 * 60 * 60);
    return diffDays < 24;
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
 * Показывает диалог подтверждения
 * @param {string} title - Заголовок диалога
 * @param {string} message - Сообщение
 * @param {function} onConfirm - Функция при подтверждении
 */
function showConfirmDialog(title, message, onConfirm) {
    const modalHtml = `
        <div class="modal fade" id="confirmModal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">${title}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <p>${message}</p>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Отмена</button>
                        <button type="button" class="btn btn-primary" id="confirmOkBtn">Подтвердить</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    $('body').append(modalHtml);
    const modal = new bootstrap.Modal(document.getElementById('confirmModal'));
    modal.show();
    $('#confirmOkBtn').on('click', function() {
        modal.hide();
        $('.modal-backdrop').remove();
        $('#confirmModal').remove();
        onConfirm();
    });
    $('#confirmModal').on('hidden.bs.modal', function() {
        $(this).remove();
    });
}