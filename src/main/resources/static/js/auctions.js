$(document).ready(function() {
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
        $('#login-item').addClass('hidden');
        $('#logout-item').removeClass('hidden');
        $('#user-cabinet-item').removeClass('hidden');
        localStorage.setItem('user', JSON.stringify(response));
        if (response.role === 'admin') {
            $('#create-auction-btn').removeClass('hidden');
        } else {
            $('#create-auction-btn').addClass('hidden');
        }
    } else {
        $('#user-info').text('');
        $('#user-role').text('Гость');
        $('#login-item').removeClass('hidden');
        $('#logout-item').addClass('hidden');
        $('#user-cabinet-item').addClass('hidden');
        $('#create-auction-btn').addClass('hidden');
        localStorage.removeItem('user');
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
 * Отображает список аукционов в контейнере
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
                <p class="text-muted mb-2">Аукционы по выбранному фильтру отсутствуют</p>
                <p class="text-muted small">Попробуйте изменить фильтр или вернитесь позже</p>
            </div>
        `);
        return;
    }
    let html = '';
    auctions.forEach(auction => {
        const timeLeft = calculateTimeLeft(auction.endTime);
        const timeClass = getTimeClass(timeLeft);
        const isNew = isAuctionNew(auction.createdAt);
        const badge = isNew ? '<span class="badge bg-success me-2"><i class="bi bi-star-fill me-1"></i>Новый</span>' : '';
        const endingSoon = timeLeft.includes('час') || timeLeft.includes('час') ? '<span class="badge bg-danger me-2"><i class="bi bi-clock me-1"></i>Скоро завершение</span>' : '';
        const creatorBadge = auction.creatorName ? `<span class="badge bg-secondary me-2"><i class="bi bi-person me-1"></i>${auction.creatorName}</span>` : '';
        html += `
            <div class="col-md-6 col-lg-4 mb-4" data-auction-id="${auction.id}" data-is-new="${isNew}" data-time-left="${timeLeft}">
                <div class="card h-100 auction-card shadow-sm">
                    <div class="position-relative">
                        <img src="${auction.imageUrl || '/uploads/auctions/NOFOTO.jpg'}" 
                            class="card-img-top" alt="${auction.title}" 
                            style="height: 200px; object-fit: cover;"
                            onerror="this.onerror=null; this.src='/uploads/auctions/NOFOTO.jpg'">
                        ${isNew || timeClass.includes('danger') ? `
                            <div class="position-absolute top-0 start-0 m-2">
                                ${isNew ? '<span class="badge bg-success">Новый</span>' : ''}
                                ${timeClass.includes('danger') ? '<span class="badge bg-danger ms-1">Скоро завершение</span>' : ''}
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
                                <a href="auction-detail.html?id=${auction.id}" class="btn btn-primary">
                                    <i class="bi bi-cash-stack me-1"></i>Сделать ставку
                                </a>
                            </div>
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
    if (timeLeft.includes('час') || timeLeft.includes('час')) return 'text-danger';
    if (timeLeft.includes('день')) return 'text-warning';
    return 'text-success';
}

/**
 * Фильтрует аукционы по выбранному критерию
 * @param {string} filter - Критерий фильтрации ('all', 'ending', 'new')
 * @returns {void}
 */
function filterAuctions(filter) {
    let filteredAuctions = [...window.allAuctions];
    switch(filter) {
        case 'ending':
            filteredAuctions = filteredAuctions.filter(auction => {
                const timeLeft = calculateTimeLeft(auction.endTime);
                return timeLeft.includes('час') || timeLeft.includes('час');
            });
            break;
        case 'new':
            filteredAuctions = filteredAuctions.filter(auction => isAuctionNew(auction.createdAt));
            break;
        case 'all':
        default:
            break;
    }
    renderAuctions(filteredAuctions);
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
 * Показывает уведомление
 * @param {string} message - Сообщение
 * @param {string} type - Тип уведомления (success, danger, warning, info)
 */
function showNotification(message, type = 'info') {
    const alertClass = type === 'success' ? 'alert-success' : 
                      type === 'danger' ? 'alert-danger' : 
                      type === 'warning' ? 'alert-warning' : 'alert-info';
    const $notification = $(`
        <div class="alert ${alertClass} alert-dismissible fade show" role="alert" 
             style="position: fixed; top: 80px; right: 20px; z-index: 9999; min-width: 300px;">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `);
    $('body').append($notification);
    setTimeout(() => {
        $notification.alert('close');
    }, 3000);
}
