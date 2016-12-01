$(document).ready(function() {

    $("#addSearch").click(setBase);
    $("#addNear").click(setBase);
    $("#addBbox").click(setBase);

    $("#logoButton").click(function(e) {
        $('#homeTab').tab('show');
    })

    var queryInputs = document.getElementsByClassName("queryInputs");
    var queryButtons = document.getElementsByClassName("queryButtons");
    for (var i = 0; i < queryInputs.length; i++) {
        queryInputs[i].addEventListener('input', updateQueryParam);
        queryButtons[i].addEventListener('click', setQueryParam);
    }

    $("#requestApiBtn").click(sendQuery);

    $("ul.navbar-nav > li > a").on("shown.bs.tab", function(e) {
        var id = $(this).attr("id");
        window.location.hash = id.slice(0, -3);
    });
    rememberState();
    window.onhashchange = function() {
      rememberState();
    }
})

function changeTab(tab) {
    $('#' + tab + 'Tab').tab('show');
    window.location.hash = tab;
}

function rememberState() {
    var hash = window.location.hash.substr(1);
    if (hash != "") {
      changeTab(hash);
    }
}

function sendQuery() {
    var query = $("#fullQuery").text();
    $.getJSON(query, function(data) {
        if (data.status == "OK") {
            if (data.sightingsReturned > 2) {
                data.sightings = data.sightings.slice(0, 3);
                data.sightings[2] = "...";
            }
        }
        document.getElementById('apiResponse').innerHTML = "";
        document.getElementById('apiResponse').appendChild(document.createElement('pre')).innerHTML = JSON.stringify(data, null, 2);
    })
}

function updateQueryParam(e, name) {
    var queryPart = name ? name : this.id.slice(0, -5);
    var currentQuery = $("#fullQuery").text();
    var queryString = (currentQuery.charAt(currentQuery.length - 1) == "?" ? "" : "&");
    if (currentQuery.split('?')[1].split('=')[0] == queryPart || currentQuery.split('?')[1].split('=')[0] == ("&" + queryPart)) {
        queryString = "";
    }
    queryString += queryPart + "=" + $("#" + queryPart + "Input").val();
    $("#" + queryPart + "Span").text(queryString);
}

function setQueryParam(e) {
    if (this.textContent == "Add") {
        this.textContent = "Remove";
        $("#" + this.id + "Input").prop('disabled', false);
        updateQueryParam(e, this.id);
        checkQuery();
    } else {
        this.textContent = "Add";
        $("#" + this.id + "Input").prop('disabled', true);
        $("#" + this.id + "Span").text("");
        checkQuery();
    }
}

function checkQuery() {
    var queryButtons = document.getElementsByClassName("queryButtons");
    for (var i = 0; i < queryButtons.length; i++) {
        if (queryButtons[i].textContent == "Remove") {
            console.log(queryButtons[i].id);
            updateQueryParam("e", queryButtons[i].id);
        }
    }
}



function resetBase() {
    var queryButtons = document.getElementsByClassName("queryButtons");
    for (var i = 0; i < queryButtons.length; i++) {
        if (queryButtons[i].textContent == "Remove") {
            queryButtons[i].textContent = "Add";
            $("#" + queryButtons[i].id + "Input").prop('disabled', true);
            $("#" + queryButtons[i].id + "Span").text("");
            checkQuery();
        }
    }
}

function setBase(e) {
    $("#base").text(this.textContent + "?")
    $(this).siblings(".active").removeClass("active");
    $(this).addClass("active");
    $("#queryParams").fadeIn();
    resetBase();
    setUpQueryParam(this.textContent);
}

function setUpQueryParam(base) {
    $("#queryForm").children().hide();
    if (base == "/search") {
        $("#fromForm").fadeIn();
        $("#toForm").fadeIn();
        $("#shapeForm").fadeIn();
        $("#cityForm").fadeIn();
        $("#stateForm").fadeIn();
        $("#limitForm").fadeIn();
        $("#skipForm").fadeIn();
    } else if (base == "/location/near") {
        $("#latForm").fadeIn();
        $("#lonForm").fadeIn();
        $("#locationForm").fadeIn();
        $("#radiusForm").fadeIn();
        $("#limitForm").fadeIn();
        $("#skipForm").fadeIn();
    } else if (base == "/location/bbox") {
        $("#bboxForm").fadeIn();
        $("#locationForm").fadeIn();
        $("#limitForm").fadeIn();
        $("#skipForm").fadeIn();
    }
}
