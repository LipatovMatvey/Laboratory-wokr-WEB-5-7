$(document).ready(function() {
    // Проверка авторизации
    checkAuth();
    
    // Обработчик выхода
    $('#logout-btn').on('click', function() {
        logout();
    });
    
    // Загрузка аукционов
    loadAuctions();
    
    // Фильтрация аукционов
    $('#auction-filters button').on('click', function() {
        const filter = $(this).data('filter');
        
        // Активный класс
        $('#auction-filters button').removeClass('active');
        $(this).addClass('active');
        
        // Применяем фильтр
        filterAuctions(filter);
    });
});

function checkAuth() {
    console.log('Проверка авторизации...');
    $.ajax({
        url: "/auth/whoAmI",
        method: "GET",
        success: function(response) {
            console.log('Ответ от сервера:', response);
            updateNavigation(response);
        },
        error: function(xhr, status, error) {
            console.error('Ошибка проверки авторизации:', error);
            updateNavigation({ authenticated: false });
        }
    });
}

function updateNavigation(response) {
    console.log('Обновление навигации с данными:', response);
    
    if (response.authenticated) {
        console.log('Пользователь авторизован, имя:', response.fullName, 'роль:', response.role);
        $('#user-info').text(response.fullName || 'Пользователь');
        $('#user-role').text(getRoleDisplayName(response.role));
        $('#login-item').addClass('hidden');
        $('#logout-item').removeClass('hidden');
        $('#user-cabinet-item').removeClass('hidden');
        localStorage.setItem('user', JSON.stringify(response));
    } else {
        console.log('Пользователь не авторизован');
        $('#user-info').text('');
        $('#user-role').text('Гость');
        $('#login-item').removeClass('hidden');
        $('#logout-item').addClass('hidden');
        $('#user-cabinet-item').addClass('hidden');
        localStorage.removeItem('user');
    }
}

function getRoleDisplayName(role) {
    switch(role) {
        case 'admin': return 'Администратор';
        case 'moder': return 'Модератор';
        case 'user': return 'Пользователь';
        default: return 'Гость';
    }
}

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


function loadAuctions() {
    $.ajax({
        url: "/api/auctions/active",
        method: "GET",
        success: function(auctions) {
            // Сохраняем все аукционы для фильтрации
            window.allAuctions = auctions;
            renderAuctions(auctions);
        },
        error: function(xhr) {
            console.error('Ошибка загрузки аукционов:', xhr.responseText);
            $('#auctions-list').html(`
                <div class="col-12 text-center">
                    <p class="text-danger">Ошибка загрузки аукционов</p>
                </div>
            `);
        }
    });
}

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
    
    // Обработчики для кнопок избранного
    $('.watchlist-btn').on('click', function() {
        const auctionId = $(this).data('auction-id');
        toggleWatchlist(auctionId, $(this));
    });
}

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
            // Все аукционы
            break;
    }
    
    renderAuctions(filteredAuctions);
}

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

function isAuctionNew(createdAt) {
    const created = new Date(createdAt);
    const now = new Date();
    const diffDays = (now - created) / (1000 * 60 * 60 * 24);
    return diffDays < 7; // Новые аукционы - созданные менее 7 дней назад
}

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