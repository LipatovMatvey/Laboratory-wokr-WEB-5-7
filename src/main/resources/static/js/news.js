$(document).ready(function() {
    checkAuth();
    $('#logout-btn').on('click', function() {
        logout();
    });
    loadNews();
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
        localStorage.setItem('user', JSON.stringify(response));
    } else {
        $('#user-info').text('');
        $('#user-role').text('Гость');
        $('#user-visits').html('');
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
 * Загружает новости с сервера
 * @returns {void}
 */
function loadNews() {
    $.ajax({
        url: "/api/news",
        method: "GET",
        success: function(news) {
            renderNews(news);
        },
        error: function(xhr) {
            $('#news-list').html(`
                <div class="col-12 text-center">
                    <p class="text-danger">Ошибка загрузки новостей</p>
                </div>
            `);
        }
    });
}

/**
 * Отображает список новостей
 * @param {Array<Object>} news - Массив объектов новостей
 * @returns {void}
 */
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
    $('.read-more-btn').on('click', function() {
        const newsId = $(this).data('news-id');
        showNewsDetail(newsId);
    });
}

/**
 * Перенаправляет на страницу детального просмотра новости
 * @param {number} newsId - ID новости
 * @returns {void}
 */
function showNewsDetail(newsId) {
    window.location.href = `news-detail.html?id=${newsId}`;
}