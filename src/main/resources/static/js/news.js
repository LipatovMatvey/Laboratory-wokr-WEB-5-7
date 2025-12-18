let currentRole = null;

checkAuth();

$('#logout-btn').on('click', function() {
    logout();
});

loadNews();

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
 */
function checkAuth() {
    $.ajax({
        url: "/auth/whoAmI",
        method: "GET",
        success: function(response) {
            currentRole = response.role;
            updateNavigation(response);
        },
        error: function() {
            updateNavigation({ authenticated: false });
        }
    });
}

/**
 * Обновляет навигацию на основе данных пользователя
 * @param {Object} response Объект с данными пользователя
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
        if (response.role === 'moder' || response.role === 'admin') {
            $('#news_block').prepend(`
                <div id="button_block">
                    <button class="btn btn-primary" id="add_button">Добавить новость</button>
                </div>
            `);
        }
    } else {
        $('#user-info').text('');
        $('#user-role').text('Гость');
        $('#login-item').removeClass('hidden');
        $('#logout-item').addClass('hidden');
        $('#user-cabinet-item').addClass('hidden');
        localStorage.removeItem('user');
    }
}

$('#news_block').on('click', '#add_button', () => {
    $('#create_news_form')[0].reset();
    const modal = new bootstrap.Modal(document.getElementById('createNewsModal'));
    modal.show();
});

$('#save_news').on('click', () => {

    const title = $('#news_title').val().trim();
    const content = $('#news_content').val().trim();
    
    if (!validationNews(title, content)) return;

    const formData = new FormData();
    formData.append("title", title);
    formData.append("content", content);

    $.ajax({
        url: "/api/news",
        method: "POST",
        processData: false,
        contentType: false,
        data: formData,
        success: function () {

            const modal = bootstrap.Modal.getInstance(document.getElementById('createNewsModal'));
            modal.hide();

            $('#create_news_form')[0].reset();

            loadNews();
        },
        error: function (xhr) {
            if (xhr.status === 400) {
                showUserNotification(xhr.responseJSON?.message, 'danger');
            }
        }
    });
});


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

let allNews = [];

/**
 * Загружает новости с сервера
 */
function loadNews() {
    $.ajax({
        url: "/api/news",
        method: "GET",
        success: function(news) {
            renderNews(news);
            allNews = news;
        },
        error: function() {
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
 * @param {Array<Object>} news Массив объектов новостей
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
        const serverDate = new Date(item.creatingDate);
        const serverDateFormat = String(serverDate.getDate()).padStart(2, '0') + 
                "." + String(serverDate.getMonth() + 1).padStart(2, '0') + "." +
                serverDate.getFullYear();
        if (currentRole === 'admin' || currentRole === 'moder') {
            html += `
                <div class="card mb-4 news-card">
                    <div class="row g-0">
                        <div class="col-md-11">
                            <div class="card-body">
                                <h5 class="card-title">${item.title}</h5>
                                <p class="card-text" id="textContent">${item.content}</p>
                                <p class="card-text">
                                    <small class="text-muted">Опубликовано: ${serverDateFormat}</small>
                                </p>
                                <p class="card-text">
                                    <small class="text-muted">Автор: ${item.createdBy}</small>
                                </p>

                                <button class="btn btn-outline-primary btn-sm read-more-btn" data-news-id="${item.id}">
                                    Читать подробнее
                                </button>
                            </div>
                        </div>
                        <div class="col-md-1 d-flex justify-content-center align-items-center">
                            <div class="btn-group" role="group">
                                <button type="button" class="btn btn-sm btn-warning edit-btn" data-news-id="${item.id}">
                                    ✏️
                                </button>
                                <button type="button" class="btn btn-sm btn-danger delete-btn" data-news-id="${item.id}">
                                    🗑
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        } else {
            html += `
                <div class="card mb-4 news-card">
                    <div class="row g-0">
                        <div class="col-md-12">
                            <div class="card-body">
                                <h5 class="card-title">${item.title}</h5>
                                <p class="card-text" id="textContent">${item.content}</p>
                                <p class="card-text">
                                    <small class="text-muted">Опубликовано: ${serverDateFormat}</small>
                                </p>
                                <p class="card-text">
                                    <small class="text-muted">Автор: ${item.createdBy}</small>
                                </p>

                                <button class="btn btn-outline-primary btn-sm read-more-btn" data-news-id="${item.id}">
                                    Читать подробнее
                                </button>
                            </div>
                        </div>  
                    </div>
                </div>
            `;
        }    
    });
    
    $container.html(html);
    
    $('.read-more-btn').on('click', function() {
        const newsId = $(this).data('news-id');
        showNewsDetail(newsId);
    });
}

/**
 * Функция возвращает объект с данными новости по ее ID
 * @param {type} newsArray Массив объектов новостей
 * @param {type} newsId Id новости
 * @returns {undefined} Объект новости
 */
function getNewsInfo(newsArray, newsId) {
    return newsArray.find( news => news.id === newsId);
}

let newsId = null;

$(document).on('click' , '.edit-btn', function () {
    newsId = $(this).data('news-id');
    let news = getNewsInfo(allNews, newsId);
    $("#new_news_title").val(news.title);
    $("#new_news_content").text(news.content);
    const modal = new bootstrap.Modal(document.getElementById('editNewsModal'));
    modal.show();
});

/**
 * Функция обновления новости
 */
function updateNews() {
    const title = $('#new_news_title').val().trim();
    const content = $('#new_news_content').val().trim();
    
    if (!validationNews(title, content)) return;
   
    const formData = new FormData();
    formData.append("title", title);
    formData.append("content", content);
    formData.append("id", newsId);
    
    $.ajax({
        url: "/api/news/update",
        method: "POST",
        processData: false,
        contentType: false,
        data: formData,
        success: function () {
            const modal = bootstrap.Modal.getInstance(document.getElementById('editNewsModal'));
            modal.hide();

            $('#edit_news_form')[0].reset();

            loadNews();
            renderNews(allNews);
            showUserNotification("Новость успешно изменена", "success");
        },
        error: function (xhr) {
            if (xhr.status === 400) {
                showUserNotification(xhr.responseJSON?.message, 'danger');
            }
        }
    });
}

$(document).on('click', '#save_edit_news' , () => {
    updateNews();
});

/**
 * Функция удаления новости
 * @param {type} newsId Id Новости
 */
function deleteNews(newsId) {
    $.ajax({
        url: `/api/news/${newsId}`,
        method: "DELETE",
        success: function () {  
            loadNews();
            renderNews(allNews);
            showUserNotification("Новость успешно удалена", "success");
            const modal = bootstrap.Modal.getInstance(document.getElementById('confirmDeleteModal'));
            modal.hide();
        },
        error: function() {  
            showUserNotification("Ошибка связи с сервером", "danger");
        }
    });
}

$(document).on('click' , '.delete-btn', function () {
    const modal = new bootstrap.Modal(document.getElementById('confirmDeleteModal'));
    modal.show();
    newsId = $(this).data('news-id');
    $('#deleteButton').data('news-id', newsId);
});

$(document).on('click', '#deleteButton', function () {
    newsId = $(this).data('news-id');
    deleteNews(newsId);
});

/**
 * Функция отображения модального окна с полным текстом новости
 * @param {type} newsId Id новости
 */
function showNewsDetail(newsId) {
    formData = new FormData();
    formData.append("id", newsId);
    $.ajax({
        url: "/api/news/getInfo",
        method: "POST",
        processData: false,
        contentType: false,
        data: formData,
        success: function(news) {          
            $('#readNewsTitle').text(`${news[0].title}`);
            $('#readNewsContent').text(`${news[0].content}`);
            $('#newsCreator').text(`Автор: ${news[0].createdBy}`);
            $('#newsDate').text(`Дата публикации: ${news[0].creatingDate}`);
            const modal = new bootstrap.Modal(document.getElementById('readNews'));
            modal.show();
        },
        error: function() {
            showUserNotification("Ошибка при загрузке новости", "danger");
        }
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
 * Функция валидации данных новости
 * @param {string} title Заголовок
 * @param {string} content Текст новости
 * @returns {bool} true - валидация пройдена успешно, иначе - false
 */
function validationNews(title, content) {
    if (!content || !title) {
        showUserNotification("Заполните заголовок и текст новости" , "warning");
        return false;
    }
    
    if (title.length > 65) {
        showUserNotification("Заголовок не должен превышать 65 символов" , "danger");
        return false;
    }
    
    if (content.length > 5000) {
        showUserNotification("Текст новости не должен превышать 5000 символов" , "danger");
        return false;
    }
    
    return true;
}
