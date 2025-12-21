$(document).ready(function() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!user.authenticated) {
        updateNavigation({ authenticated: false });
    }
    checkAuth();
    $('#logout-btn').on('click', function() {
        logout();
    });
    loadFeaturedAuctions();
    loadNewsFeed();
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
 * Проверяет статус авторизации пользователя
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
    } else {
        $('#user-info').text('');
        $('#user-role').text('Гость');
        $('#user-visits').html('');
        $('#login-item').removeClass('hidden');
        $('#logout-item').addClass('hidden');
        $('#user-cabinet-item').addClass('hidden');
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
 * Загружает рекомендуемые аукционы для главной страницы
 * @returns {void}
 */
function loadFeaturedAuctions() {
    $.ajax({
        url: "/api/auctions/active",
        method: "GET",
        success: function(auctions) {
            renderFeaturedAuctions(auctions);
        },
        error: function(xhr) {
            $('#featured-auctions').html(`
                <div class="col-12 text-center">
                    <p class="text-muted">Активные аукционы пока отсутствуют</p>
                    <a href="auctions.html" class="btn btn-primary">Перейти к аукционам</a>
                </div>
            `);
        }
    });
}

/**
 * Отображает рекомендуемые аукционы на главной странице
 * @param {Array<Object>} auctions - Массив объектов аукционов
 * @returns {void}
 */
function renderFeaturedAuctions(auctions) {
    const $container = $('#featured-auctions');
    if (!auctions || auctions.length === 0) {
        $container.html(`
            <div class="col-12 text-center">
                <p class="text-muted">Активные аукционы пока отсутствуют</p>
                <a href="auctions.html" class="btn btn-primary">Перейти к аукционам</a>
            </div>
        `);
        return;
    }
    let html = '';
    auctions.slice(0, 6).forEach(auction => {
        const timeLeft = calculateTimeLeft(auction.endTime);
        const timeClass = getTimeClass(timeLeft);
        const isNew = isAuctionNew(auction.createdAt);
        const badge = isNew ? '<span class="badge bg-success me-1">Новый</span>' : '';
        html += `
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="card auction-card shadow-sm h-100">
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
                    </div>
                    <div class="card-body d-flex flex-column">
                        <h5 class="card-title">${badge}${auction.title}</h5>
                        <p class="card-text flex-grow-1 text-muted small">
                            ${auction.description ? (auction.description.length > 80 ?
                                auction.description.substring(0, 80) + '...' : auction.description) : 'Описание отсутствует'}
                        </p>
                        <div class="mt-auto">
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <span class="fw-bold text-primary">${formatPrice(auction.currentPrice || auction.startPrice || 0)} ₽</span>
                                <small class="text-muted">Шаг: ${formatPrice(auction.step || 0)} ₽</small>
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
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    $container.html(html);
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
            <a href="auction-detail.html?id=${auction.id}" class="btn btn-secondary btn-sm">
                <i class="bi bi-eye me-1"></i>Посмотреть
            </a>
        `;
    }
    if (user.authenticated) {
        return `
            <a href="auction-detail.html?id=${auction.id}" class="btn btn-primary btn-sm">
                <i class="bi bi-cash-stack me-1"></i>Сделать ставку
            </a>
        `;
    } else {
        return `
            <a href="auth.html" class="btn btn-primary btn-sm">
                <i class="bi bi-box-arrow-in-right me-1"></i>Войти для ставки
            </a>
        `;
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
    if (days > 0) return `${days} дней`;
    if (hours > 0) return `${hours} часов`;
    return 'Менее часа';
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
 * Проверяет, является ли аукцион новым (создан менее 1 дня назад)
 * @param {string} createdAt - Дата создания аукциона в формате ISO
 * @returns {boolean} true если аукцион новый
 */
function isAuctionNew(createdAt) {
    const created = new Date(createdAt);
    const now = new Date();
    const diffHours = (now - created) / (1000 * 60 * 60);
    return diffHours < 24;
}

/**
 * Функция подгружает новости в ленту новостей
 */
function loadNewsFeed() {
    $.ajax({
        url: "/api/news",
        method: "GET",
        success: function (news) {
            let html = '';
            news.forEach( news => {
                const serverDate = new Date(news.creatingDate);
                const serverDateFormat = String(serverDate.getDate()).padStart(2, '0') + 
                    "." + String(serverDate.getMonth() + 1).padStart(2, '0') + "." +
                    serverDate.getFullYear();
                html += `
                    <div class="news-item mb-3 pb-3 border-bottom">
                        <h6 class="news-title">${news.title}</h6>
                        <p class="news-content small text-muted" id="newsContent">${news.content}</p>
                        <small class="text-muted">${news.createdBy}</small>
                        <small class="text-muted">${serverDateFormat}</small>
                    </div>
                `;
            });
           $("#news-feed").append(html); 
        },
        error: function () {
            showUserNotification("Ошибка связи с сервером", "danger");
        }
    });
    
}