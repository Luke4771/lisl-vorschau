/* Native Dialoge fuer Rechtsgebiete und Kontakt. Impressum und Datenschutz
   haben seit dem 6. September 2026 eigene Seiten und keinen Dialog mehr.
   Die Adresszeile spiegelt den geoeffneten Dialog, damit Links teilbar sind und
   ein Neuladen denselben Dialog zeigt. Bewusst nur replaceState: eine
   Rueckwaertsnavigation aus dem Skript heraus wird von Browsern ohne
   Nutzeraktion blockiert, und zusaetzliche History-Eintraege wuerden das
   Verlassen der Seite erschweren. Die Zurueck-Geste auf Android schliesst den
   Dialog ohnehin selbst. Ohne JavaScript uebernimmt der :target-Fallback in
   styles.css. */

/* Nach dem Klick soll das aufgeklappte Rechtsgebiet vollstaendig im Fenster
   stehen, Titel und ganzer Inhalt. Von selbst tut es das nicht:

   - Schliesst das vorige Gebiet oberhalb, schrumpft waehrend des Uebergangs
     Inhalt ueber der angeklickten Zeile weg und zieht ihren Titel nach oben aus
     dem Bild. Unter Zivilrecht sind das ueber 500 Pixel.
   - Steht die Zeile weit unten, waechst der neue Inhalt unter die Fensterkante.

   Beides erledigt eine einzige Bewegung: die Zeile bekommt beim Klick eine
   Sollhoehe im Fenster, und der Seitenlauf wird Bild fuer Bild dorthin gefuehrt.
   Der Fortschritt kommt dabei nicht aus einer eigenen Uhr, sondern aus der
   gerade gemessenen Hoehe des aufgehenden Inhalts. Damit folgt das Scrollen
   genau der Dauer und der Kurve, die --register-dauer und --register-kurve in
   styles.css vorgeben, ohne sie hier zu wiederholen. Fehlt der Uebergang, etwa
   bei weniger Bewegung, steht die volle Hoehe schon im ersten Bild, und der
   Ausgleich greift ein einziges Mal, noch vor der Anzeige.

   Passt der Inhalt nicht ins Fenster, ruecken Titel und Inhalt so weit nach
   oben wie moeglich; mehr ist dann nicht zu holen. Das Zuklappen loest nichts
   aus, dort faellt nur Inhalt unterhalb des Titels weg. Native Bedienung
   bleibt unveraendert. */

const REGISTER_ABSTAND = 24;  /* Luft ueber dem Titel und unter dem Inhalt */

document.querySelectorAll(".area-register").forEach((register) => {
  let aktivierung = 0;

  register.querySelectorAll(".area-row > summary").forEach((summary) => {
    summary.addEventListener("click", () => {
      const row = summary.parentElement;
      if (row.open) return;

      /* Vor dem Umschalten gemessen: dorthin hat der Nutzer geklickt. */
      const start = summary.getBoundingClientRect().top;
      const lauf = ++aktivierung;
      const beginn = performance.now();
      const steuerung = new AbortController();
      const stil = getComputedStyle(row);
      let ziel = null;
      let voll = 0;
      let unten = 0;

      /* Wer waehrend der Bewegung selbst scrollt, hat Vorrang. Eigenes Scrollen
         loest diese Ereignisse nicht aus, der Ausgleich hebt sich also nicht
         selbst auf. */
      ["wheel", "touchmove", "keydown"].forEach((art) => {
        window.addEventListener(art, () => { aktivierung += 1; }, { signal: steuerung.signal, passive: true });
      });

      const halten = () => {
        if (lauf !== aktivierung || !row.open) {
          steuerung.abort();
          return;
        }

        const zeile = summary.getBoundingClientRect();

        if (ziel === null) {
          /* Der neue Inhalt steht bereits im Layout, auch wenn ihn der
             Uebergang noch auf Hoehe null zusammenhaelt. */
          voll = row.querySelector(".area-detail")?.getBoundingClientRect().height ?? 0;
          const platz = window.innerHeight - REGISTER_ABSTAND - zeile.height - voll;
          ziel = Math.min(Math.max(start, REGISTER_ABSTAND), Math.max(REGISTER_ABSTAND, platz));
          /* Unter dem Inhalt sitzt noch die trennende Linie der Zeile. Ohne
             diesen Abzug gilt der Uebergang als fertig, waehrend das Gebiet
             darueber noch das letzte Stueck zusammenklappt; gemessen blieben so
             drei Pixel Versatz stehen. */
          unten = parseFloat(stil.paddingBottom) + parseFloat(stil.borderBottomWidth);
        }

        const offen = row.getBoundingClientRect().bottom - zeile.bottom - unten;
        const fertig = voll <= 0 || voll - offen < .5;
        const fortschritt = fertig ? 1 : Math.max(offen, 0) / voll;

        const soll = start + (ziel - start) * fortschritt;
        const versatz = zeile.top - soll;
        /* "instant" ist noetig: "auto" folgt dem weichen scroll-behavior der
           Seite, der Ausgleich kaeme dann Bild fuer Bild zu spaet. */
        if (Math.abs(versatz) >= .5) window.scrollBy({ top: versatz, behavior: "instant" });

        /* Die Zeitschranke fasst den Fall ab, dass die Hoehe nie ankommt. */
        if (!fertig && performance.now() - beginn < 1500) requestAnimationFrame(halten);
        else steuerung.abort();
      };

      requestAnimationFrame(halten);
    });
  });
});

const dialogs = [...document.querySelectorAll("dialog")];
const triggerFor = (id) => document.querySelector(`[data-dialog="${id}"]`);
const openDialogElement = () => dialogs.find((item) => item.open);
const plainUrl = () => location.pathname + location.search;
const dialogAnchor = () => document.getElementById(location.hash.slice(1)) instanceof HTMLDialogElement;

let returnFocus = null;

function openDialog(dialog, trigger) {
  const active = openDialogElement();
  if (active === dialog) return;
  if (active) active.close();

  /* Ausloeser aus einem Dialog heraus ueberschreiben das Ziel nicht: der Fokus
     soll am Ende dort landen, wo die Dialogfolge begonnen hat. */
  if (!trigger?.closest("dialog")) {
    returnFocus = trigger ?? null;
  }

  dialog.showModal();
  dialog.scrollTop = 0;
}

function restoreFocus() {
  const target = returnFocus;
  returnFocus = null;
  if (!target?.isConnected) return;
  /* Nach dem naechsten Frame, sonst setzt die eigene Fokusrueckgabe des
     Browsers den Fokus wieder auf das Element vor dem Dialog. */
  requestAnimationFrame(() => target.focus({ preventScroll: true }));
}

document.querySelectorAll("[data-dialog]").forEach((trigger) => {
  trigger.addEventListener("click", (event) => {
    const dialog = document.getElementById(trigger.dataset.dialog);
    if (!(dialog instanceof HTMLDialogElement)) return;

    event.preventDefault();
    openDialog(dialog, trigger);
    history.replaceState({ dialog: dialog.id }, "", `#${dialog.id}`);
  });
});

dialogs.forEach((dialog) => {
  dialog.querySelector("[data-close]")?.addEventListener("click", () => dialog.close());

  /* Klick auf die Flaeche neben dem Dialog schliesst ihn. Der Vergleich mit den
     Abmessungen unterscheidet den Backdrop vom Dialog selbst. */
  dialog.addEventListener("click", (event) => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    const outside = event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom;
    if (outside) dialog.close();
  });

  /* Das close-Ereignis kommt verzoegert. Steht dann bereits ein anderer Dialog
     offen, war dies nur der Wechsel innerhalb einer Dialogfolge: Adresse und
     Fokus gehoeren dem neuen Dialog und bleiben unberuehrt. */
  dialog.addEventListener("close", () => {
    if (openDialogElement()) return;
    /* Geraeumt wird nur ein Anker, der auf einen Dialog zeigt. Seit es das
       Vollbildmenue gibt, setzen seine Punkte einen Abschnittsanker wie
       #kontakt-abschnitt, und der Dialog schliesst im selben Klick. Ohne die
       Pruefung nahm das Schliessen dem Sprungziel gleich wieder die Adresse. */
    if (dialogAnchor()) history.replaceState(null, "", plainUrl());
    restoreFocus();
  });
});

/* Aenderungen der Adresszeile von aussen, etwa ueber die Zurueck-Taste. */
window.addEventListener("popstate", () => {
  const target = document.getElementById(location.hash.slice(1));
  const active = openDialogElement();

  if (target instanceof HTMLDialogElement) {
    openDialog(target, triggerFor(target.id));
    return;
  }

  if (active) active.close();
});

/* Vollbildmenue der schmalen Fenster. Es laeuft ueber denselben nativen Dialog
   wie die uebrigen Inhalte, bekommt aber einen eigenen Ausloeser statt
   data-dialog: ein geoeffnetes Menue gehoert nicht in die Adresszeile, sonst
   zeigte ein geteilter Link das Menue statt der Seite. Alles Uebrige, also
   Schliessen ueber das Kreuz, Escape und die Fokusrueckgabe, kommt aus der
   allgemeinen Verdrahtung oben. */

const menu = document.getElementById("hauptmenue");
const menuToggle = document.querySelector(".nav-toggle");

if (menu instanceof HTMLDialogElement && menuToggle) {
  menuToggle.addEventListener("click", () => {
    openDialog(menu, menuToggle);
    menuToggle.setAttribute("aria-expanded", "true");
  });

  /* Ein Sprungziel auf derselben Seite wirkt erst, wenn das Menue zu ist.
     Ausloeser eines anderen Dialogs sind ausgenommen: openDialog schliesst das
     Menue dort schon selbst, ein zweites close() kaeme dem zuvor. */
  menu.querySelectorAll("a:not([data-dialog])").forEach((link) => {
    link.addEventListener("click", () => menu.close());
  });

  menu.addEventListener("close", () => menuToggle.setAttribute("aria-expanded", "false"));
}

/* Direkter Aufruf mit Anker, etwa aus einer E-Mail heraus. */
const linkedDialog = document.getElementById(location.hash.slice(1));
if (linkedDialog instanceof HTMLDialogElement) {
  openDialog(linkedDialog, triggerFor(linkedDialog.id));
}
