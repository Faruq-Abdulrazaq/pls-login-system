const params = new URLSearchParams(window.location.search);
const error = params.get("error");
const message = params.get("message");

if (error != null && message != null) {
  document.getElementById("p1").innerHTML = "Oops an unexpected error occured";
  document.getElementById("p2").innerHTML = message;
  document.getElementById("icon_1").style.display = "none";
  document.getElementById("icon_2").style.display = "block";
}
