$('.auth-tab').on('click', function() {
    const tab = $(this).data('tab');
    console.log(tab);
    $('.auth-tab').removeClass('active');
    $(this).addClass('active');

    $('.auth-form').removeClass('active');
    $(`#${tab}-form`).addClass('active');
});

$('.toggle-password').on('click', function() {
    const target = $(this).data('target');
    const input = $(`#${target}`);
    const type = input.attr('type') === 'password' ? 'text' : 'password';
    input.attr('type', type);
    $(this).text(type === 'password' ? '👁️' : '🔒');
});

$('#login-form').on('submit', function(e) {
    e.preventDefault();

    const email = $('#login-email').val();
    const password = $('#login-password').val();

    $.ajax({
        url: "/auth/login",
        method: "POST",
        contentType: "application/json",
        data: JSON.stringify({
            email: email,
            password: password
        }),
        success: function(response) {
            localStorage.setItem('user', JSON.stringify(response));
            window.location.href = "main.html";
        },
        error: function(xhr) {
            $(".error").text("");
            const response = xhr.responseJSON;
            switch (response.error) {
                case "Такого пользователя не существует":
                    $("#login-email-error").text("Такого пользователя не существует");
                    break;
                case "Неверный пароль":
                    $("#login-password-error").text("Неверный пароль");
                    break;
                case "Пользователь с таким email был заблокирован":
                    $("#login-email-error").text("Пользователь с таким email был заблокирован");
                    break;
            }
        }
    });
});

$('#register-form').on('submit', function(e) {
    e.preventDefault();

    const formData = new FormData();
    formData.append('email', $('#register-email').val());
    formData.append('fullName', $('#register-name').val());
    formData.append('password', $('#register-password').val());
    formData.append('birthDate', $('#birth-date').val());

    const birthDate = $('#birth-date').val();
    if (!validateDate(birthDate)) {
        $("#error-birth-date").text("Дата некорректна!");
        return;
    }

    const fullName = $('#register-name').val();
    if (!validFullName(fullName)) {
        $('#error-name').text("Некорректные имя и фамилия");
        return;
    }

    const password = $('#register-password').val();
    if (password.length < 6) {
        $("#error-password").text("Длина пароля должна быть не менее 6 символов");
        return;
    }

    const confirmPassword = $('#register-confirm-password').val();

    if (password !== confirmPassword) {
        $("#error-repeat-password").text("Пароли не совпадают");
        return;
    }

    $.ajax({
        url: "/auth/register",
        method: "POST",
        data: formData,
        processData: false,
        contentType: false,
        success: function(response) {
            localStorage.setItem('user', JSON.stringify(response));
            console.log(response);
            window.location.href = "main.html";
        },
        error: function(xhr) {
            $(".error").text("");
            const response = xhr.responseJSON;
            switch (response.error) {
                case "Пользователь с таким Email уже существует":
                    $("#error-email").text("Пользователь с таким Email уже существует");
                    break;
            }
        }
    });
});

function validateDate(birthDate) {
    const today = new Date();
    const date = new Date(birthDate);

    let age = today.getFullYear() - date.getFullYear();
    const md = today.getMonth() - date.getMonth();
    if (md < 0 || (md === 0 && today.getDate() < date.getDate())) age--;

    return age >= 0 && age <= 120 ? true : false;
};

function validFullName(fullName) {
    if (typeof fullName !== "string") return false;
    fullName = fullName.trim();
    const regex = /^[A-ZА-ЯЁ][a-zа-яё]+\s[A-ZА-ЯЁ][a-zа-яё]+$/;
    return regex.test(fullName);
}