function onUrlChange(callback) {
    let currentUrl = location.href;
  
    const observer = new MutationObserver(() => {
      if (currentUrl !== location.href) {
        currentUrl = location.href;
        callback(currentUrl);
      }
    });
  
    observer.observe(document, { subtree: true, childList: true });
  
    // Patch pushState & replaceState
    const pushState = history.pushState;
    history.pushState = function (...args) {
      pushState.apply(history, args);
      window.dispatchEvent(new Event('urlchange'));
    };
  
    const replaceState = history.replaceState;
    history.replaceState = function (...args) {
      replaceState.apply(history, args);
      window.dispatchEvent(new Event('urlchange'));
    };
  
    window.addEventListener('popstate', () => window.dispatchEvent(new Event('urlchange')));
  
    window.addEventListener('urlchange', () => {
      if (currentUrl !== location.href) {
        currentUrl = location.href;
        callback(currentUrl);
      }
    });
  }
  
  // Utilisation :
  onUrlChange((newUrl) => {
    deleteElement()
    createButtonPopup()
  });
  
  createButtonPopup()
  
function deleteElement() {
    const button = document.getElementById('answerButton');
    if (button) {
        button.remove();
    }
    const popup = document.getElementById('awnserPopup');
    if (popup) {
        popup.remove();
    }
}

function createButtonPopup() {
    const actionBar = document.querySelector('div[data-testid="composer-trailing-actions"]');
    var button = document.createElement("button");
    button.id = "answerButton";
    button.innerHTML = "🍃";
    actionBar.appendChild(button);
    var popup = document.createElement("div");
    popup.id = "awnserPopup";
    popup.innerHTML = "<p>Consomation total de la conversation :</p>";
    document.body.appendChild(popup);
    button.addEventListener("click", function(event) {
        if (popup.style.display === "none" || popup.style.display === "") {
            generatePopup(popup);
            popup.style.display = "block";
            popup.style.visibility = "hidden";
        
            const rect = button.getBoundingClientRect();
            const popupHeight = popup.offsetHeight;
        
            popup.style.left = `${rect.left - 100}px`;
            popup.style.top = `${rect.top - popupHeight}px`;
        
            popup.style.visibility = "visible";
        } else {
            popup.style.display = "none";
        }
    });
}

function generatePopup(popup) {
    const result = getGPTAnswers()
    popup.innerHTML = `
     <div class="container">
        <h1 class="title">Résumé de consomation : </h1>
        <table class="table">
            <tbody>
                <tr>
                    <td>Nombre de caractères</td>
                    <td id="nbCaracteres">${sommePropriete(result, 'nbCaracteres')}</td>
                </tr>
                <tr>
                    <td>Nombre de phrases</td>
                    <td id="nbPhrases">${sommePropriete(result, 'nbPhrases')}</td>
                </tr>
                <tr>
                    <td>Nombre de liste</td>
                    <td id="contientListe">${sommeBoolean(result, 'contientListe')}</td>
                </tr>
                <tr>
                    <td>Nombre de raisonnement</td>
                    <td id="contientRaisonnement">${sommeBoolean(result, 'contientRaisonnement')}</td>
                </tr>
                <tr>
                    <td>Nombres d'image</td>
                    <td id="image">${sommeBoolean(result, 'image')}</td>
                </tr>
                <tr>
                    <td>Score</td>
                    <td id="score">${sommePropriete(result, 'score')}</td>
                </tr>
                <tr>
                    <td>CO2e</td>
                    <td id="co2e">${sommePropriete(result, 'co2e')}g</td>
                </tr>
                <tr>
                    <td>Consommation d'électricité</td>
                    <td id="electricite">${sommePropriete(result, 'electricite')}Wh</td>
                </tr>
                <tr>
                    <td>Consommation d'eau</td>
                    <td id="eau">${sommePropriete(result, 'eau')}L</td>
                </tr>
            </tbody>
        </table>
    </div>
    `
    saveConsomationStorage(result)
}

function saveConsomationStorage(result) {
    const lastResult = result[result.length-1]
    const lastprompt = {
        score: lastResult.score,
        eau: lastResult.eau,
        electricite: lastResult.electricite,
        co2e: lastResult.co2e
    } 
    chrome.storage.local.set({ LAST_PROMPT: lastprompt })
}

function sommeBoolean(listeObjets, propriete) {
    return listeObjets.reduce((accumulateur, objet) => {
        if (typeof objet[propriete] === 'boolean' && objet[propriete]) {
          return accumulateur + 1; // Incrémente le compteur si la propriété est true
        }
        return accumulateur;
      }, 0);
  }
  
  function sommePropriete(listeObjets, propriete) {
    return listeObjets.reduce((accumulateur, objet) => {
      return accumulateur + (objet[propriete] || 0); // Si la propriété n'existe pas, on ajoute 0
    }, 0);
  }
  
function getGPTAnswers() {
    return Array.from(document.querySelectorAll('article')).filter(article =>
        article.querySelector('h6.sr-only')?.textContent.includes('ChatGPT a dit'))
        .map(article => { 
            return estimerComplexiteAvecImage(article.innerText)
        } );;
}

function estimerComplexiteAvecImage(reponse) {
    // Nettoyage basique
    const texte = reponse.trim();
    
    // Mesures de base
    console.log(texte)
    const image = texte.startsWith("ChatGPT a dit :\nImage créée")
    const nbCaracteres = texte.length;
    const nbPhrases = (texte.match(/[.!?]/g) || []).length;
    const contientCode = false
    const contientListe = /•|- |\* /.test(texte);
    const contientRaisonnement = ["car", "donc", "tandis que", "parce que", "cependant", "en revanche"].some(mot => texte.toLowerCase().includes(mot));
    
    // Score de complexité
    let score = 0;
    if (nbCaracteres > 600) {
        score += 2; 
    } else if (nbCaracteres > 200) {
        score += 1;
    }
    if (contientCode || contientListe) {
        score += 1;
    }
    if (contientRaisonnement) {
        score += 2;
    }
    if (image) {
        score += 3;
    }

    // Calcul de l'impact écologique
    const co2e = score * 2; // ~2g CO₂e par point
    const electricite = score * 0.01; // ~0.01 Wh par point
    const eau = score * 0.3; // ~0.3 L par point

    // Niveau de complexité estimé
    let niveau = "Basse";
    if (score >= 6) {
        niveau = "Élevée";
    } else if (score >= 3) {
        niveau = "Moyenne";
    }

    return {
        "nbCaracteres": nbCaracteres,
        "nbPhrases": nbPhrases,
        "contientCode": contientCode,
        "contientListe": contientListe,
        "contientRaisonnement": contientRaisonnement,
        "image": image,
        "score": score,
        "niveau": niveau,
        "co2e": co2e,
        "electricite": electricite,
        "eau": eau
    };
}