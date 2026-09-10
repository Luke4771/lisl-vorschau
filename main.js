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

/* Zeitmarke des Seitenlaufs, den die Seite selbst ausloest. Der Ausgleich
   unten scrollt beim Aufklappen von sich aus, unter Zivilrecht um mehrere
   hundert Pixel nach oben. Der Kopf am Ende der Datei haelt das sonst fuer ein
   Zurueckscrollen des Nutzers und faehrt ein. Der Zuschlag deckt das Bild ab,
   in dem der Lauf ankommt. */
let eigenerLauf = 0;

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
        if (Math.abs(versatz) >= .5) {
          window.scrollBy({ top: versatz, behavior: "instant" });
          eigenerLauf = performance.now() + 100;
        }

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

/* Auftritt der Bloecke beim Scrollen, angelegt am 7. September 2026. Die
   Klasse .auftritt steht im Markup und haelt den Block unsichtbar, .ist-da gibt
   ihn frei; die Bewegung selbst steht in styles.css, Abschnitt "Auftritt beim
   Scrollen". Hier faellt nur die Entscheidung, wann sie beginnt.

   Jeder Block wird genau einmal freigegeben und danach nicht mehr beobachtet.
   Beim Zurueckscrollen bewegt sich nichts erneut.

   threshold bleibt 0, stattdessen wandert die untere Kante des
   Beobachtungsfensters um ein Zehntel nach oben. Ein Anteil wie 0,15 kommt bei
   einem Block, der hoeher ist als das Fenster, nie zustande, und das
   aufgeklappte Zivilrecht ist genau so ein Block; er bliebe unsichtbar. */

const auftritte = document.querySelectorAll(".auftritt");

if ("IntersectionObserver" in window) {
  const auftrittBeobachter = new IntersectionObserver((eintraege, beobachter) => {
    eintraege.forEach((eintrag) => {
      if (!eintrag.isIntersecting) return;
      eintrag.target.classList.add("ist-da");
      beobachter.unobserve(eintrag.target);
    });
  }, { threshold: 0, rootMargin: "0px 0px -10% 0px" });

  auftritte.forEach((element) => auftrittBeobachter.observe(element));
} else {
  auftritte.forEach((element) => element.classList.add("ist-da"));
}

/* Kopf beim Zurueckscrollen, angelegt am 10. September 2026. Der Kopf laeuft
   mit der Seite aus dem Bild und kommt zurueck, sobald jemand nach oben
   scrollt. Die Bewegung selbst steht in styles.css, Abschnitt "Kopf beim
   Zurueckscrollen"; hier fallen nur die beiden Entscheidungen.

   kopf-fest heftet ihn an die Fensteroberkante, sobald sein eigener Platz im
   Seitenlauf oben aus dem Bild ist. Darunter faellt die Klasse weg: dort steht
   der Kopf an seinem Platz und soll wie bisher ohne Flaeche und ohne Linie
   auf dem Papier liegen.

   kopf-sichtbar blendet ihn ein, aber erst unterhalb des Heros. Im Hero bleibt
   er weg, so wollte es Alfred am 10. September 2026: dort steht der Kopf
   ohnehin am Seitenanfang, eine zweite Leiste ueber dem Portrait waere
   doppelt. Seiten ohne Hero haben nur eine Schwelle, die Unterkante des
   Kopfes; dort kommt er gleich nach dem Verschwinden zurueck.

   Gemessen wird ohne die Klassen: angeheftet stuende die gemessene Unterkante
   am Fensterrand statt an ihrem Platz im Seitenlauf. Das Wegnehmen und das
   neue Setzen liegen im selben Arbeitsschritt, dazwischen zeichnet der Browser
   nicht. */

const kopf = document.querySelector(".site-header");
const heroSchirm = document.querySelector(".hero-screen");

if (kopf) {
  const TOLERANZ = 2;  /* Zittern von Trackpad und Zeiger ist keine Richtung */

  let kopfSchwelle = 0;
  let heroSchwelle = 0;
  let letzteHoehe = Math.max(window.scrollY, 0);
  let sichtbar = false;
  let wartet = false;

  const messen = () => {
    kopf.classList.remove("kopf-fest", "kopf-weich", "kopf-sichtbar");
    const lauf = window.scrollY;
    kopfSchwelle = kopf.getBoundingClientRect().bottom + lauf;
    heroSchwelle = heroSchirm ? heroSchirm.getBoundingClientRect().bottom + lauf : kopfSchwelle;
  };

  const pruefen = () => {
    /* Negative Werte kommen vom Ueberziehen am oberen Rand, etwa auf iOS. */
    const hoehe = Math.max(window.scrollY, 0);

    if (performance.now() >= eigenerLauf) {
      if (hoehe < letzteHoehe - TOLERANZ) sichtbar = true;
      else if (hoehe > letzteHoehe + TOLERANZ) sichtbar = false;
    }

    if (Math.abs(hoehe - letzteHoehe) > TOLERANZ) letzteHoehe = hoehe;

    const fest = hoehe > kopfSchwelle;

    /* Das erste Bild am Kopf bleibt ohne Uebergang, sonst blendete er beim
       Anheften sichtbar aus statt einfach weg zu sein; siehe styles.css. */
    if (!fest) {
      kopf.classList.remove("kopf-fest", "kopf-weich");
    } else if (!kopf.classList.contains("kopf-fest")) {
      kopf.classList.add("kopf-fest");
      requestAnimationFrame(() => {
        if (kopf.classList.contains("kopf-fest")) kopf.classList.add("kopf-weich");
      });
    }

    kopf.classList.toggle("kopf-sichtbar", fest && sichtbar && hoehe > heroSchwelle);
  };

  messen();
  pruefen();

  window.addEventListener("scroll", () => {
    if (wartet) return;
    wartet = true;
    requestAnimationFrame(() => {
      wartet = false;
      pruefen();
    });
  }, { passive: true });

  /* Neu messen, wenn sich die Hoehe des Heros aendern kann: beim Drehen und
     Groessenaendern des Fensters und einmal, wenn Bilder und Schriften da
     sind. */
  const neuMessen = () => {
    messen();
    pruefen();
  };

  window.addEventListener("resize", neuMessen);
  window.addEventListener("load", neuMessen);
}
