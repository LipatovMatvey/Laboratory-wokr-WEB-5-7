$(document).ready(function() {
    // Проверка авторизации
    checkAuth();
    
    // Обработчик выхода
    $('#logout-btn').on('click', function() {
        logout();
    });
    
    // Загрузка новостей
    loadNews();
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

function loadNews() {
    $.ajax({
        url: "/api/news",
        method: "GET",
        success: function(news) {
            renderNews(news);
        },
        error: function(xhr) {
            console.error('Ошибка загрузки новостей:', xhr.responseText);
            $('#news-list').html(`
                <div class="col-12 text-center">
                    <p class="text-danger">Ошибка загрузки новостей</p>
                </div>
            `);
        }
    });
}

function renderNews(news) {
    const $container = $('#news-list');
    
    if (!news || news.length === 0) {
        $container.html(`
            <div class="col-12 text-center">
                <p class="text-muted">Новости пока отсутствуют</p>
            </div>
        `);
        return;
    }
    
    let html = '';
    news.forEach(item => {
        html += `
            <div class="card mb-4 news-card">
                <div class="row g-0">
                    <div class="col-md-4">
                        <img src="${item.imageUrl || 'https://via.placeholder.com/400x200'}" 
                             class="img-fluid rounded-start h-100" 
                             style="object-fit: cover;" 
                             alt="${item.title}">
                    </div>
                    <div class="col-md-8">
                        <div class="card-body">
                            <h5 class="card-title">${item.title}</h5>
                            <p class="card-text">${item.content}</p>
                            <p class="card-text">
                                <small class="text-muted">Опубликовано: ${new Date(item.publishDate).toLocaleDateString('ru-RU')}</small>
                            </p>
                            <button class="btn btn-outline-primary btn-sm read-more-btn" data-news-id="${item.id}">
                                Читать подробнее
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    $container.html(html);
    
    // Обработчики для кнопок "Читать подробнее"
    $('.read-more-btn').on('click', function() {
        const newsId = $(this).data('news-id');
        showNewsDetail(newsId);
    });
}

function showNewsDetail(newsId) {
    // Переход на страницу детального просмотра новости
    window.location.href = `news-detail.html?id=${newsId}`;
}