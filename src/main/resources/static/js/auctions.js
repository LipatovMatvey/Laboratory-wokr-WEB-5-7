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
            $("#server-time").text("Точное московское время: "+data.time);
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
    } else {
        $('#user-info').text('');
        $('#user-role').text('Гость');
        $('#login-item').removeClass('hidden');
        $('#logout-item').addClass('hidden');
        $('#user-cabinet-item').addClass('hidden');
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
        },
        error: function(xhr) {
            $('#auctions-list').html(`
                <div class="col-12 text-center">
                    <p class="text-danger">Ошибка загрузки аукционов</p>
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
            <div class="col-12 text-center">
                <p class="text-muted">Аукционы по выбранному фильтру отсутствуют</p>
            </div>
        `);
        return;
    }
    
    let html = '';
    auctions.forEach(auction => {
        const timeLeft = calculateTimeLeft(auction.endTime);
        const timeClass = timeLeft.includes('час') ? 'text-danger' : 'text-warning';
        const isNew = isAuctionNew(auction.createdAt);
        const badge = isNew ? '<span class="badge bg-success me-2">Новый</span>' : '';
        
        html += `
            <div class="col-md-6 col-lg-4 mb-4" data-auction-id="${auction.id}" data-is-new="${isNew}" data-time-left="${timeLeft}">
                <div class="card h-100 auction-card">
                    <img src="${auction.imageUrl || 'https://via.placeholder.com/300x200'}" 
                         class="card-img-top" alt="${auction.title}" 
                         style="height: 200px; object-fit: cover;">
                    <div class="card-body d-flex flex-column">
                        <h5 class="card-title">${badge}${auction.title}</h5>
                        <p class="card-text flex-grow-1">${auction.description || ''}</p>
                        <div class="mt-auto">
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <span class="fw-bold text-primary">${auction.currentPrice?.toLocaleString() || '0'} ₽</span>
                                <small class="text-muted">Начальная: ${auction.startPrice?.toLocaleString() || '0'} ₽</small>
                            </div>
                            <div class="d-flex justify-content-between align-items-center mb-3">
                                <small class="text-muted">Ставок: ${auction.bidsCount || 0}</small>
                                <small class="${timeClass}">${timeLeft}</small>
                            </div>
                            <div class="d-grid gap-2">
                                <a href="auction-detail.html?id=${auction.id}" class="btn btn-primary">Сделать ставку</a>
                                <button class="btn btn-outline-secondary btn-sm watchlist-btn" data-auction-id="${auction.id}">
                                    ❤️ В избранное
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    $container.html(html);
    
    $('.watchlist-btn').on('click', function() {
        const auctionId = $(this).data('auction-id');
        toggleWatchlist(auctionId, $(this));
    });
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
                return timeLeft.includes('час') || timeLeft.includes('день');
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
    
    if (days > 0) return `${days} дней`;
    if (hours > 0) return `${hours} часов`;
    return 'Менее часа';
}

/**
 * Проверяет, является ли аукцион новым (создан менее 7 дней назад)
 * @param {string} createdAt - Дата создания аукциона в формате ISO
 * @returns {boolean} true если аукцион новый
 */
function isAuctionNew(createdAt) {
    const created = new Date(createdAt);
    const now = new Date();
    const diffDays = (now - created) / (1000 * 60 * 60 * 24);
    return diffDays < 7;
}

/**
 * Добавляет или удаляет аукцион из избранного
 * @param {number} auctionId - ID аукциона
 * @param {jQuery} $button - jQuery объект кнопки
 * @returns {void}
 */
function toggleWatchlist(auctionId, $button) {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (!user.authenticated) {
        alert('Для добавления в избранное необходимо авторизоваться');
        return;
    }
    
    $.ajax({
        url: `/api/watchlist/${auctionId}`,
        method: "POST",
        success: function(response) {
            if (response.inWatchlist) {
                $button.text('✓ Добавлено').removeClass('btn-outline-secondary').addClass('btn-success');
            } else {
                $button.text('❤️ В избранное').removeClass('btn-success').addClass('btn-outline-secondary');
            }
        },
        error: function(xhr) {
            const response = xhr.responseJSON;
            alert(response?.error || 'Ошибка при добавлении в избранное');
        }
    });
}