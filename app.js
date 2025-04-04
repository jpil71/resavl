// Configuration organisation
const organizationName = "VOTRE ORGANISATION";
const adminPassword = "admin123"; // Mot de passe admin

// Variables globales
let currentUser = null;
let calendar = null;
let reservations = [];
let editModal = null;

// Initialisation au chargement
document.addEventListener('DOMContentLoaded', function() {
    loadReservations();
    setupEventListeners();
});

// Charger les réservations existantes
function loadReservations() {
    const saved = localStorage.getItem('carReservations');
    if (saved) {
        reservations = JSON.parse(saved);
    } else {
        // Données exemple si vide
        const today = new Date();
        const endDate = new Date();
        endDate.setDate(today.getDate() + 2);
        
        reservations = [{
            id: 1,
            title: 'VL01 - Admin',
            start: today.toISOString().split('T')[0],
            end: endDate.toISOString().split('T')[0],
            color: '#ff9f89',
            extendedProps: {
                voiture: 'VL01',
                user: 'Admin',
                status: 'confirmed'
            }
        }];
        saveReservations();
    }
}

// Sauvegarder les réservations
function saveReservations() {
    localStorage.setItem('carReservations', JSON.stringify(reservations));
}

// Configuration des écouteurs d'événements
function setupEventListeners() {
    document.getElementById('reservationForm').addEventListener('submit', function(e) {
        e.preventDefault();
        submitReservation();
    });
}

// Connexion
function login() {
    const username = document.getElementById('username').value.trim();
    if (!username) {
        alert('Veuillez entrer un nom d\'utilisateur');
        return;
    }
    
    // Vérification mot de passe admin
    const isAdmin = (username.toLowerCase() === 'admin' && 
                    prompt('Mot de passe admin:') === adminPassword);
    
    currentUser = {
        name: username,
        isAdmin: isAdmin
    };
    
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('appSection').style.display = 'block';
    
    initCalendar();
}

// Déconnexion
function logout() {
    currentUser = null;
    document.getElementById('loginSection').style.display = 'block';
    document.getElementById('appSection').style.display = 'none';
    document.getElementById('username').value = '';
}

// Initialisation du calendrier
function initCalendar() {
    const calendarEl = document.getElementById('calendar');
    
    calendar = new FullCalendar.Calendar(calendarEl, {
        locale: 'fr',
        firstDay: 1,
        initialView: 'dayGridMonth',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek'
        },
        buttonText: {
            today: 'Aujourd\'hui',
            month: 'Mois',
            week: 'Semaine'
        },
        events: reservations,
        eventContent: function(arg) {
            const eventEl = document.createElement('div');
            eventEl.innerHTML = `
                <div style="font-weight:bold;">${arg.event.extendedProps.voiture}</div>
                <div style="font-size:0.8em;">${arg.event.extendedProps.user}</div>
            `;
            
            if (currentUser.isAdmin) {
                const controlsDiv = document.createElement('div');
                controlsDiv.className = 'admin-controls';
                
                const editBtn = document.createElement('button');
                editBtn.className = 'edit-btn';
                editBtn.textContent = 'Changer véhicule';
                editBtn.onclick = (e) => {
                    e.stopPropagation();
                    openEditModal(arg.event, 'vehicle');
                };
                
                const nameBtn = document.createElement('button');
                nameBtn.className = 'change-btn';
                nameBtn.textContent = 'Changer nom';
                nameBtn.onclick = (e) => {
                    e.stopPropagation();
                    openEditModal(arg.event, 'name');
                };
                
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'delete-btn';
                deleteBtn.textContent = 'Supprimer';
                deleteBtn.onclick = (e) => {
                    e.stopPropagation();
                    deleteReservation(arg.event.id);
                };
                
                controlsDiv.appendChild(editBtn);
                controlsDiv.appendChild(nameBtn);
                controlsDiv.appendChild(deleteBtn);
                eventEl.appendChild(controlsDiv);
            }
            
            return { domNodes: [eventEl] };
        },
        dateClick: function(info) {
            if (currentUser) {
                document.getElementById('startDate').value = info.dateStr;
                document.getElementById('endDate').value = info.dateStr;
                document.getElementById('userName').value = currentUser.name;
                document.getElementById('reservationModal').style.display = 'block';
            }
        }
    });
    
    calendar.render();
}

// Soumettre une réservation
function submitReservation() {
    const voiture = document.getElementById('voiture').value;
    const startDate = document.getElementById('startDate').value;
    let endDate = new Date(document.getElementById('endDate').value);
    endDate.setDate(endDate.getDate() + 1); // Ajouter 1 jour pour l'affichage
    
    const newReservation = {
        id: Date.now(),
        title: `${voiture} - ${document.getElementById('userName').value}`,
        start: startDate,
        end: endDate.toISOString().split('T')[0],
        color: getVehicleColor(voiture),
        extendedProps: {
            voiture: voiture,
            user: document.getElementById('userName').value,
            status: 'confirmed'
        }
    };
    
    if (hasConflict(newReservation)) {
        alert('Ce véhicule est déjà réservé pour cette période!');
        return;
    }
    
    reservations.push(newReservation);
    saveReservations();
    calendar.addEvent(newReservation);
    closeModal();
}

// Ouvrir le modal de modification
function openEditModal(event, editType) {
    if (editModal) {
        document.body.removeChild(editModal);
    }
    
    const modalTitle = editType === 'vehicle' 
        ? 'Modifier le véhicule' 
        : 'Modifier le nom du réservataire';
    
    const currentValue = editType === 'vehicle' 
        ? event.extendedProps.voiture 
        : event.extendedProps.user;
    
    const inputField = editType === 'vehicle'
        ? `
            <select id="editValue" required>
                <option value="VL01" ${currentValue === 'VL01' ? 'selected' : ''}>VL01 - Peugeot 208</option>
                <option value="VL02" ${currentValue === 'VL02' ? 'selected' : ''}>VL02 - Renault Clio</option>
                <option value="VL03" ${currentValue === 'VL03' ? 'selected' : ''}>VL03 - Citroën C3</option>
            </select>
        `
        : `<input type="text" id="editValue" value="${currentValue}" required>`;
    
    editModal = document.createElement('div');
    editModal.className = 'modal';
    editModal.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="document.body.removeChild(this.parentElement.parentElement)">&times;</span>
            <h3>${modalTitle}</h3>
            <div class="form-group">
                <label>Valeur actuelle:</label>
                <input type="text" value="${currentValue}" disabled>
            </div>
            <div class="form-group">
                <label>Nouvelle valeur:</label>
                ${inputField}
            </div>
            <button class="btn btn-primary" onclick="updateReservation('${event.id}', '${editType}')">
                Valider
            </button>
        </div>
    `;
    
    document.body.appendChild(editModal);
    editModal.style.display = 'block';
}

// Mettre à jour une réservation
function updateReservation(eventId, editType) {
    const newValue = document.getElementById('editValue').value.trim();
    if (!newValue) {
        alert('Veuillez saisir une valeur valide');
        return;
    }
    
    const index = reservations.findIndex(r => r.id == eventId);
    if (index === -1) return;
    
    let updatedReservation = {...reservations[index]};
    
    if (editType === 'vehicle') {
        // Vérifier les conflits
        const tempReservations = reservations.filter(r => r.id != eventId);
        const hasConflict = tempReservations.some(r => {
            return r.extendedProps.voiture === newValue &&
                new Date(updatedReservation.start) < new Date(r.end) &&
                new Date(updatedReservation.end) > new Date(r.start);
        });
        
        if (hasConflict) {
            alert('Ce véhicule est déjà réservé pour cette période!');
            return;
        }
        
        updatedReservation = {
            ...updatedReservation,
            title: `${newValue} - ${updatedReservation.extendedProps.user}`,
            color: getVehicleColor(newValue),
            extendedProps: {
                ...updatedReservation.extendedProps,
                voiture: newValue
            }
        };
    } else {
        updatedReservation = {
            ...updatedReservation,
            title: `${updatedReservation.extendedProps.voiture} - ${newValue}`,
            extendedProps: {
                ...updatedReservation.extendedProps,
                user: newValue
            }
        };
    }
    
    // Mettre à jour les données
    reservations[index] = updatedReservation;
    saveReservations();
    
    // Mettre à jour l'affichage
    const event = calendar.getEventById(eventId.toString());
    if (event) {
        event.setProp('title', updatedReservation.title);
        if (editType === 'vehicle') {
            event.setProp('color', updatedReservation.color);
            event.setExtendedProp('voiture', newValue);
        } else {
            event.setExtendedProp('user', newValue);
        }
    }
    
    // Fermer le modal
    document.body.removeChild(editModal);
    editModal = null;
}

// Supprimer une réservation
function deleteReservation(eventId) {
    if (!confirm('Supprimer cette réservation ?')) return;
    
    reservations = reservations.filter(r => r.id != eventId);
    saveReservations();
    
    const event = calendar.getEventById(eventId.toString());
    if (event) event.remove();
}

// Fermer le modal
function closeModal() {
    document.getElementById('reservationModal').style.display = 'none';
    document.getElementById('reservationForm').reset();
}

// Obtenir la couleur du véhicule
function getVehicleColor(voiture) {
    const colors = {
        'VL01': '#ff9f89', // Orange
        'VL02': '#6fa8dc', // Bleu
        'VL03': '#93c47d'  // Vert
    };
    return colors[voiture] || '#cccccc';
}

// Vérifier les conflits
function hasConflict(newRes) {
    const newStart = new Date(newRes.start);
    const newEnd = new Date(newRes.end);
    
    return reservations.some(res => {
        if (res.extendedProps.voiture !== newRes.extendedProps.voiture) return false;
        if (res.id === newRes.id) return false;
        
        const resStart = new Date(res.start);
        const resEnd = new Date(res.end);
        
        return (newStart < resEnd && newEnd > resStart);
    });
}
