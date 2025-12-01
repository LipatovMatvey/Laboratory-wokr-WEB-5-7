$(document).ready(function() {
    // Проверка авторизации при загрузке страницы
    checkAuth();
    
    // Обработчик выхода
    $('#logout-btn').on('click', function() {
        logout();
    });
    
    // Загрузка активных аукционов
    loadFeaturedAuctions();
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

function loadFeaturedAuctions() {
    $.ajax({
        url: "/api/auctions/featured",
        method: "GET",
        success: function(auctions) {
            renderFeaturedAuctions(auctions);
        },
        error: function(xhr) {
            console.error('Ошибка загрузки аукционов:', xhr.responseText);
            $('#featured-auctions').html(`
                <div class="col-12 text-center">
                    <p class="text-muted">Активные аукционы пока отсутствуют</p>
                    <a href="auctions.html" class="btn btn-primary">Перейти к аукционам</a>
                </div>
            `);
        }
    });
}

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
    auctions.forEach(auction => {
        const timeLeft = calculateTimeLeft(auction.endTime);
        const timeClass = timeLeft.includes('час') ? 'text-danger' : 'text-warning';
        
        html += `
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="card auction-card">
                    <img src="${auction.imageUrl || 'https://via.placeholder.com/300x200'}" 
                         class="card-img-top" alt="${auction.title}" 
                         style="height: 200px; object-fit: cover;">
                    <div class="card-body">
                        <h5 class="card-title">${auction.title}</h5>
                        <p class="card-text">${auction.description || ''}</p>
                        <p class="card-text">Текущая цена: <strong>${auction.currentPrice?.toLocaleString() || '0'} ₽</strong></p>
                        <p class="card-text"><small class="${timeClass}">Заканчивается: ${timeLeft}</small></p>
                        <a href="auction-detail.html?id=${auction.id}" class="btn btn-primary btn-sm">Подробнее</a>
                    </div>
                </div>
            </div>
        `;
    });
    
    $container.html(html);
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