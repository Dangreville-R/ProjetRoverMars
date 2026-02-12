// Gestion du formulaire de connexion
document.getElementById('formulaireConnexion').addEventListener('submit', function (evenement) {
    evenement.preventDefault();

    var email = document.getElementById('email').value;
    var motDePasse = document.getElementById('motDePasse').value;
    var seSouvenir = document.getElementById('seSouvenir').checked;
    var bouton = document.querySelector('.bouton-connexion');

    // Desactiver le bouton pendant le traitement
    bouton.textContent = 'Connexion...';
    bouton.disabled = true;

    // Ici, ajoutez votre logique de connexion (appel API, etc.)
    console.log('Connexion:', { email: email, seSouvenir: seSouvenir });

    // Simulation d'une requete
    setTimeout(function () {
        bouton.textContent = 'Se connecter';
        bouton.disabled = false;
        // Redirection apres connexion reussie
        // window.location.href = 'dashboard.html';
    }, 1500);
});
