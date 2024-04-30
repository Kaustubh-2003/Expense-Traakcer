document.addEventListener("DOMContentLoaded", function () {
    const plusIcon = document.querySelector(".add-transaction");
    const formContainer = document.getElementById("transactionForm");
    const closeButton = document.getElementById("closeButton");

    plusIcon.addEventListener("click", function () {

        formContainer.classList.toggle("hide");
    });

    closeButton.addEventListener("click", function () {
        formContainer.classList.add("hide"); // Ensure the form is hidden when the close button is clicked
    });

});

// document.addEventListener("DOMContentLoaded", function () {
//     const closeIcon = document.querySelector(".close");
//     const formContainer = document.getElementById("transactionForm");
//     const closeButton = document.getElementById("closeButton");

//     closeIcon.addEventListener("click", function () {
//         alert("clicked");

//         formContainer.classList.toggle("hide");
//     });

// });