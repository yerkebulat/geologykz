/* Lightweight client-side UI translations. No framework. */
(function (global) {
  var STORAGE = 'kzgeology-lang';
  var LANGS = { en: 1, kk: 1, ru: 1 };
  var STR = {
    "seo.h1": { en: "Geological maps of Kazakhstan", kk: "Қазақстанның геологиялық карталары", ru: "Геологические карты Казахстана" },
    "seo.intro": { en: "A free viewer for geological maps of Kazakhstan: the 1:1.5M geological map, 1:200,000 geological sheets, faults, mineral deposits and seismicity.", kk: "Қазақстанның геологиялық карталарын тегін қарау құралы: 1:1 500 000 геологиялық карта, 1:200 000 геологиялық парақтар, жарылымдар, кен орындары және сейсмикалық белсенділік.", ru: "Бесплатный просмотр геологических карт Казахстана: геологическая карта 1:1 500 000, геологические листы 1:200 000, разломы, месторождения и сейсмичность." },
    "seo.browse": { en: "All maps and 1:200,000 sheets", kk: "Барлық карталар және 1:200 000 парақтар", ru: "Все карты и листы 1:200 000" },
    "nav.about": { en: "About", kk: "Жоба туралы", ru: "О проекте" },
    "nav.made": { en: "How it's made", kk: "Қалай жасалды", ru: "Как это сделано" },
    "nav.sources": { en: "Sources", kk: "Дереккөздер", ru: "Источники" },
    "nav.contribute": { en: "Contribute", kk: "Үлес қосу", ru: "Участие" },
    "nav.code": { en: "Open source", kk: "Ашық код", ru: "Исходный код" },
    "nav.authors": { en: "Authors", kk: "Авторлар", ru: "Авторы" },
    "nav.sponsor": { en: "Sponsor", kk: "Демеуші болу", ru: "Стать спонсором" },
    "nav.donate": { en: "Donate maps", kk: "Карта ұсыну", ru: "Предложить карту" },
    "nav.donateShort": { en: "Donate", kk: "Ұсыну", ru: "Предложить" },
    "nav.play": { en: "Play", kk: "Ойын", ru: "Игра" },
    "nav.logout": { en: "Log out", kk: "Шығу", ru: "Выйти" },
    "nav.map": { en: "Map", kk: "Карта", ru: "Карта" },
    "nav.menu": { en: "Menu", kk: "Мәзір", ru: "Меню" },
    "nav.lang": { en: "Language", kk: "Тіл", ru: "Язык" },
    "sub.maps": { en: "Geological maps of Kazakhstan", kk: "Қазақстанның геологиялық карталары", ru: "Геологические карты Казахстана" },
    "panel.maps": { en: "Maps", kk: "Карталар", ru: "Карты" },
    "panel.hideMaps": { en: "Hide maps", kk: "Жасыру", ru: "Скрыть" },
    "panel.basemap": { en: "Basemap", kk: "Негізгі карта", ru: "Подложка" },
    "panel.map": { en: "Map", kk: "Карта", ru: "Карта" },
    "panel.sat": { en: "Satellite", kk: "Спутник", ru: "Спутник" },
    "panel.satSource": { en: "Satellite source", kk: "Спутник көзі", ru: "Источник снимков" },
    "panel.goto": { en: "Go to coordinates", kk: "Координаттарға өту", ru: "Перейти к координатам" },
    "panel.coords": { en: "Coordinates", kk: "Координаттар", ru: "Координаты" },
    "panel.go": { en: "Go", kk: "Өту", ru: "Перейти" },
    "panel.notes": { en: "Explanatory notes", kk: "Түсіндірме жазбалар", ru: "Пояснительные записки" },
    "panel.notesEn": { en: "English", kk: "Ағылшынша", ru: "English" },
    "panel.notesRu": { en: "Russian", kk: "Орысша", ru: "Русский" },
    "panel.notesTitle": { en: "Title", kk: "Титул", ru: "Титул" },
    "panel.notesContents": { en: "Contents", kk: "Мазмұны", ru: "Содержание" },
    "panel.sources": { en: "Sources and credits", kk: "Дереккөздер", ru: "Источники и сведения" },
    "panel.copyLink": { en: "Copy link", kk: "Сілтемені көшіру", ru: "Скопировать ссылку" },
    "panel.copied": { en: "Copied", kk: "Көшірілді", ru: "Скопировано" },
    "panel.copyFailed": { en: "Copy failed", kk: "Көшіру сәтсіз", ru: "Не удалось скопировать" },
    "panel.copy": { en: "Copy", kk: "Көшіру", ru: "Копировать" },
    "panel.copyThisLink": { en: "Copy this link", kk: "Осы сілтемені көшіріңіз", ru: "Скопируйте эту ссылку" },
    "legend.title": { en: "Legend", kk: "Легенда", ru: "Легенда" },
    "legend.hide": { en: "Hide", kk: "Жасыру", ru: "Скрыть" },
    "legend.show": { en: "Legend", kk: "Легенда", ru: "Легенда" },
    "info.more": { en: "More ({n})", kk: "Тағы ({n})", ru: "Ещё ({n})" },
    "info.less": { en: "Show less", kk: "Азырақ көрсету", ru: "Свернуть" },
    "loading.map": { en: "Loading map…", kk: "Карта жүктелуде…", ru: "Загрузка карты…" },
    "loading.fail": { en: "Could not load map", kk: "Картаны жүктеу мүмкін болмады", ru: "Не удалось загрузить карту" },
    "loading.licenses": { en: "Loading licenses…", kk: "Лицензиялар жүктелуде…", ru: "Загрузка лицензий…" },
    "loading.licensesFail": { en: "Could not load licenses. Try again, or open the official map.", kk: "Лицензияларды жүктеу мүмкін болмады. Қайталап көріңіз немесе ресми картаны ашыңыз.", ru: "Не удалось загрузить лицензии. Попробуйте ещё раз или откройте официальную карту." },
    "loading.details": { en: "Loading details…", kk: "Мәліметтер жүктелуде…", ru: "Загрузка сведений…" },
    "loading.detailsFail": { en: "Details could not be loaded.", kk: "Мәліметтерді жүктеу мүмкін болмады.", ru: "Не удалось загрузить сведения." },
    "loading.noAttrs": { en: "No attributes for this block.", kk: "Бұл блоктың мәліметтері жоқ.", ru: "Для этого блока нет сведений." },
    "loading.relayMissing": { en: "Relay URL is missing.", kk: "Реле мекенжайы жоқ.", ru: "Адрес реле не задан." },
    "geo200.sheets": { en: "{n} sheets", kk: "{n} парақ", ru: "{n} листов" },
    "loading.pugfn": { en: "Loading PUGFN…", kk: "PUGFN жүктелуде…", ru: "Загрузка PUGFN…" },
    "loading.pugfnFail": { en: "Could not load PUGFN.", kk: "PUGFN жүктеу мүмкін болмады.", ru: "Не удалось загрузить PUGFN." },
    "loading.process": { en: "Loading {label}…", kk: "{label} жүктелуде…", ru: "Загрузка: {label}…" },
    "loading.processFail": { en: "Could not load {label}.", kk: "{label} жүктеу мүмкін болмады.", ru: "Не удалось загрузить: {label}." },
    "act.title": { en: "Active layers ({n})", kk: "Белсенді қабаттар ({n})", ru: "Активные слои ({n})" },
    "act.actions": { en: "Layer actions", kk: "Қабат әрекеттері", ru: "Действия со слоем" },
    "act.up": { en: "Move up", kk: "Жоғары", ru: "Выше" },
    "act.down": { en: "Move down", kk: "Төмен", ru: "Ниже" },
    "act.zoom": { en: "Zoom to", kk: "Жақындату", ru: "Приблизить" },
    "act.remove": { en: "Remove", kk: "Алып тастау", ru: "Убрать" },
    "act.hide": { en: "Hide layer", kk: "Қабатты жасыру", ru: "Скрыть слой" },
    "act.show": { en: "Show layer", kk: "Қабатты көрсету", ru: "Показать слой" },
    "act.opacity": { en: "Opacity {pct}%", kk: "Мөлдірлік {pct}%", ru: "Прозрачность {pct}%" },
    "act.opacityPct": { en: "Opacity percent", kk: "Мөлдірлік, пайыз", ru: "Прозрачность, процент" },
    "act.typeValue": { en: "Type a value", kk: "Мәнді енгізіңіз", ru: "Введите значение" },
    "act.search": { en: "Search layer", kk: "Қабаттан іздеу", ru: "Поиск по слою" },
    "act.searchPlaceholder": { en: "Search by name", kk: "Атауы бойынша іздеу", ru: "Поиск по названию" },
    "tool.measure": { en: "Measure", kk: "Өлшеу", ru: "Измерить" },
    "tool.distance": { en: "Distance", kk: "Қашықтық", ru: "Расстояние" },
    "tool.area": { en: "Area", kk: "Аудан", ru: "Площадь" },
    "tool.profile": { en: "Profile", kk: "Бейін", ru: "Профиль" },
    "tool.compare": { en: "Compare", kk: "Салыстыру", ru: "Сравнить" },
    "compare.left": { en: "Left", kk: "Сол", ru: "Слева" },
    "compare.right": { en: "Right", kk: "Оң", ru: "Справа" },
    "compare.basemap": { en: "Basemap", kk: "Негізгі карта", ru: "Подложка" },
    "compare.slider": { en: "Compare divider", kk: "Салыстыру бөлгіші", ru: "Разделитель сравнения" },
    "tool.bookmarks": { en: "Bookmarks", kk: "Бетбелгілер", ru: "Закладки" },
    "bm.save": { en: "Save", kk: "Сақтау", ru: "Сохранить" },
    "bm.name": { en: "View name", kk: "Көрініс атауы", ru: "Название вида" },
    "bm.delete": { en: "Delete view", kk: "Көріністі жою", ru: "Удалить вид" },
    "tool.gps": { en: "GPS", kk: "GPS", ru: "GPS" },
    "gps.note": { en: "Note", kk: "Ескертпе", ru: "Заметка" },
    "gps.log": { en: "Log point", kk: "Нүктені жазу", ru: "Сохранить точку" },
    "gps.waiting": { en: "Waiting for GPS…", kk: "GPS күтілуде…", ru: "Ожидание GPS…" },
    "gps.denied": { en: "Location unavailable", kk: "Орналасу қолжетімсіз", ru: "Геолокация недоступна" },
    "gps.csv": { en: "CSV", kk: "CSV", ru: "CSV" },
    "gps.geojson": { en: "GeoJSON", kk: "GeoJSON", ru: "GeoJSON" },
    "gps.delete": { en: "Delete point", kk: "Нүктені жою", ru: "Удалить точку" },
    "profile.min": { en: "Min", kk: "Мин", ru: "Мин" },
    "profile.max": { en: "Max", kk: "Макс", ru: "Макс" },
    "profile.ascent": { en: "Ascent", kk: "Көтерілу", ru: "Подъём" },
    "profile.close": { en: "Close profile", kk: "Бейінді жабу", ru: "Закрыть профиль" },
    "profile.fail": { en: "No elevation data", kk: "Биіктік деректері жоқ", ru: "Нет данных о высоте" },
    "profile.hint": { en: "Click two or more points on the map. The profile updates as you add them.", kk: "Картада екі немесе одан көп нүктені басыңыз. Биіктік профилі нүктелер қосылған сайын жаңартылады.", ru: "Нажмите на карте две или более точек. Профиль обновляется по мере их добавления." },
    "profile.loading": { en: "Loading elevation...", kk: "Биіктік жүктелуде...", ru: "Загрузка высот..." },
    "profile.download": { en: "Download", kk: "Жүктеу", ru: "Скачать" },
    "profile.png": { en: "PNG", kk: "PNG", ru: "PNG" },
    "profile.excel": { en: "Excel", kk: "Excel", ru: "Excel" },
    "profile.csv": { en: "CSV", kk: "CSV", ru: "CSV" },
    "profile.exportTitle": { en: "Elevation profile", kk: "Биіктік профилі", ru: "Профиль высот" },
    "profile.samples": { en: "Samples", kk: "Нүктелер", ru: "Точки" },
    "profile.summary": { en: "Summary", kk: "Қорытынды", ru: "Сводка" },
    "profile.totalLength": { en: "Total length", kk: "Жалпы ұзындық", ru: "Общая длина" },
    "profile.vertices": { en: "Line vertices", kk: "Сызық нүктелері", ru: "Вершины линии" },
    "profile.start": { en: "Start", kk: "Басы", ru: "Начало" },
    "profile.end": { en: "End", kk: "Соңы", ru: "Конец" },
    "profile.source": { en: "Source", kk: "Дереккөз", ru: "Источник" },
    "profile.needGeology": { en: "Turn on the geological map to colour the profile by unit.", kk: "Қиманы бірліктер бойынша бояу үшін геологиялық картаны қосыңыз.", ru: "Включите геологическую карту, чтобы раскрасить профиль по единицам." },
    "tool.grid": { en: "Grid", kk: "Тор", ru: "Сетка" },
    "tool.print": { en: "Print", kk: "Басып шығару", ru: "Печать" },
    "tool.sketch": { en: "Sketch", kk: "Сызу", ru: "Рисование" },
    "tool.pencil": { en: "Pencil", kk: "Қарындаш", ru: "Карандаш" },
    "tool.eraser": { en: "Eraser", kk: "Өшіргіш", ru: "Ластик" },
    "tool.thin": { en: "Thin", kk: "Жіңішке", ru: "Тонкая" },
    "tool.thick": { en: "Thick", kk: "Жуан", ru: "Толстая" },
    "tool.undo": { en: "Undo", kk: "Қайтару", ru: "Отменить" },
    "tool.clear": { en: "Clear", kk: "Тазалау", ru: "Очистить" },
    "tool.done": { en: "Done", kk: "Дайын", ru: "Готово" },
    "tool.topview": { en: "Top view (D)", kk: "Үстіңгі көрініс (D)", ru: "Вид сверху (D)" },
    "tool.north": { en: "Reset north", kk: "Солтүстікті түзеу", ru: "Ориентировать на север" },
    "tool.3d": { en: "3D", kk: "3D", ru: "3D" },
    "color.black": { en: "Black", kk: "Қара", ru: "Чёрный" },
    "color.red": { en: "Red", kk: "Қызыл", ru: "Красный" },
    "color.blue": { en: "Blue", kk: "Көк", ru: "Синий" },
    "color.green": { en: "Green", kk: "Жасыл", ru: "Зелёный" },
    "color.yellow": { en: "Yellow", kk: "Сары", ru: "Жёлтый" },
    "print.title": { en: "Print map", kk: "Картаны басып шығару", ru: "Печать карты" },
    "print.fieldTitle": { en: "Title", kk: "Атауы", ru: "Название" },
    "print.paper": { en: "Paper", kk: "Қағаз", ru: "Бумага" },
    "print.orient": { en: "Orientation", kk: "Бағдар", ru: "Ориентация" },
    "print.landscape": { en: "Landscape", kk: "Көлденең", ru: "Альбомная" },
    "print.portrait": { en: "Portrait", kk: "Тік", ru: "Книжная" },
    "print.north": { en: "North arrow", kk: "Солтүстік бағыты", ru: "Стрелка севера" },
    "print.grid": { en: "Grid", kk: "Тор", ru: "Сетка" },
    "print.scale": { en: "Scale bar", kk: "Масштаб сызғышы", ru: "Масштабная линейка" },
    "print.date": { en: "Date", kk: "Күні", ru: "Дата" },
    "print.attr": { en: "Attribution", kk: "Дереккөз", ru: "Атрибуция" },
    "print.cancel": { en: "Cancel", kk: "Болдырмау", ru: "Отмена" },
    "print.download": { en: "Download PDF", kk: "PDF жүктеу", ru: "Скачать PDF" },
    "print.rendering": { en: "Rendering map…", kk: "Карта дайындалуда…", ru: "Подготовка карты…" },
    "print.building": { en: "Building PDF…", kk: "PDF жиналуда…", ru: "Сборка PDF…" },
    "print.loadingView": { en: "Loading view…", kk: "Көрініс жүктелуде…", ru: "Загрузка вида…" },
    "print.notReady": { en: "The map is not ready yet. Try again.", kk: "Карта әлі дайын емес. Қайталап көріңіз.", ru: "Карта ещё не готова. Попробуйте ещё раз." },
    "print.fail": { en: "Could not create the PDF. Try again.", kk: "PDF жасау мүмкін болмады. Қайталап көріңіз.", ru: "Не удалось создать PDF. Попробуйте ещё раз." },
    "print.satAttr": { en: "Satellite imagery", kk: "Спутниктік түсірілім", ru: "Спутниковые снимки" },
    "print.osmAttr": { en: "Basemap © OpenStreetMap contributors, OpenFreeMap", kk: "Негізгі карта © OpenStreetMap contributors, OpenFreeMap", ru: "Подложка © OpenStreetMap contributors, OpenFreeMap" },
    "donate.title": { en: "Donate maps", kk: "Карта ұсыну", ru: "Предложить карту" },
    "donate.lead": { en: "Share a map you have the right to contribute. We review every submission before anything is published.", kk: "Өзіңіз ұсынуға құқығыңыз бар картаны жіберіңіз. Әр ұсыныс жарияланбас бұрын қаралады.", ru: "Пришлите карту, которую вы вправе передать. Каждую заявку мы смотрим до публикации." },
    "donate.name": { en: "Name", kk: "Аты-жөні", ru: "Имя" },
    "donate.email": { en: "Email", kk: "Эл. пошта", ru: "Эл. почта" },
    "donate.mapTitle": { en: "Map title", kk: "Карта атауы", ru: "Название карты" },
    "donate.source": { en: "Source or year", kk: "Дереккөз немесе жыл", ru: "Источник или год" },
    "donate.note": { en: "Note", kk: "Ескертпе", ru: "Примечание" },
    "donate.optional": { en: "optional", kk: "міндетті емес", ru: "необязательно" },
    "donate.file": { en: "File", kk: "Файл", ru: "Файл" },
    "donate.hint": { en: "PDF, JPG, PNG, TIFF, KMZ, KML, GeoJSON, or ZIP. Up to 95 MB.", kk: "PDF, JPG, PNG, TIFF, KMZ, KML, GeoJSON немесе ZIP. Көлемі 95 МБ-қа дейін.", ru: "PDF, JPG, PNG, TIFF, KMZ, KML, GeoJSON или ZIP. До 95 МБ." },
    "donate.rights": { en: "I have the right to share this map", kk: "Бұл картаны бөлісуге құқығым бар", ru: "Я имею право передать эту карту" },
    "donate.cancel": { en: "Cancel", kk: "Болдырмау", ru: "Отмена" },
    "donate.send": { en: "Send", kk: "Жіберу", ru: "Отправить" },
    "donate.sending": { en: "Sending…", kk: "Жіберілуде…", ru: "Отправка…" },
    "donate.thanks": { en: "Thank you. Your map was received.", kk: "Рақмет. Картаңыз қабылданды.", ru: "Спасибо. Карта получена." },
    "donate.errUnavailable": { en: "Donations are temporarily unavailable.", kk: "Карта ұсыну уақытша қолжетімсіз.", ru: "Приём карт временно недоступен." },
    "donate.errTurnstile": { en: "Could not load the verification check. Refresh and try again.", kk: "Тексеру жүктелмеді. Бетті жаңартып, қайта көріңіз.", ru: "Не удалось загрузить проверку. Обновите страницу и попробуйте снова." },
    "donate.errFields": { en: "Please fill in your name, email, and the map title.", kk: "Аты-жөніңізді, поштаңызды және карта атауын толтырыңыз.", ru: "Укажите имя, эл. почту и название карты." },
    "donate.errEmail": { en: "Please enter a valid email address.", kk: "Жарамды эл. пошта мекенжайын енгізіңіз.", ru: "Введите корректный адрес эл. почты." },
    "donate.errRights": { en: "Please confirm that you have the right to share this map.", kk: "Бұл картаны бөлісуге құқығыңыз бар екенін растаңыз.", ru: "Подтвердите, что вы вправе передать эту карту." },
    "donate.errFile": { en: "Please choose a file.", kk: "Файлды таңдаңыз.", ru: "Выберите файл." },
    "donate.errType": { en: "That file type is not accepted.", kk: "Бұл файл түрі қабылданбайды.", ru: "Этот тип файла не принимается." },
    "donate.errSize": { en: "The file is larger than 95 MB.", kk: "Файл көлемі 95 МБ-тан асады.", ru: "Файл больше 95 МБ." },
    "donate.errCheck": { en: "Please complete the verification check.", kk: "Тексеруді аяқтаңыз.", ru: "Пройдите проверку." },
    "donate.errRate": { en: "Too many submissions. Please try again later.", kk: "Тым көп ұсыныс жіберілді. Кейінірек көріңіз.", ru: "Слишком много заявок. Попробуйте позже." },
    "donate.errSend": { en: "Could not send the file. Please try again.", kk: "Файлды жіберу мүмкін болмады. Қайталап көріңіз.", ru: "Не удалось отправить файл. Попробуйте ещё раз." },
    "rights.note": { en: "If you hold rights to a map and object to its use here, contact us and we will remove it.", kk: "Егер картаға құқығыңыз болса және оны мұнда көрсетуге қарсы болсаңыз, хабарласыңыз, оны алып тастаймыз.", ru: "Если вы обладаете правами на карту и возражаете против её показа здесь, напишите нам, и мы её уберём." },
    "kv.commodities": { en: "Commodities", kk: "Пайдалы қазбалар", ru: "Полезные ископаемые" },
    "kv.minor": { en: "Minor", kk: "Кіші", ru: "Второстепенные" },
    "kv.type": { en: "Type", kk: "Түрі", ru: "Тип" },
    "kv.size": { en: "Size", kk: "Мөлшері", ru: "Размер" },
    "kv.age": { en: "Age", kk: "Жасы", ru: "Возраст" },
    "kv.grade": { en: "Grade", kk: "Сапасы", ru: "Содержание" },
    "kv.slip": { en: "Slip type", kk: "Ығысу түрі", ru: "Тип смещения" },
    "kv.source": { en: "Source", kk: "Дереккөз", ru: "Источник" },
    "kv.depth": { en: "Depth", kk: "Тереңдік", ru: "Глубина" },
    "kv.date": { en: "Date", kk: "Күні", ru: "Дата" },
    "kv.location": { en: "Location", kk: "Орны", ru: "Местоположение" },
    "kv.rock": { en: "Rock", kk: "Жыныс", ru: "Порода" },
    "kv.regime": { en: "Regime", kk: "Режим", ru: "Режим" },
    "kv.quality": { en: "Quality", kk: "Сапасы", ru: "Качество" },
    "kv.azimuth": { en: "Azimuth", kk: "Азимут", ru: "Азимут" },
    "kv.site": { en: "Site", kk: "Орын", ru: "Пункт" },
    "kv.heatflow": { en: "Heat flow", kk: "Жылу ағыны", ru: "Тепловой поток" },
    "kv.environment": { en: "Environment", kk: "Орта", ru: "Обстановка" },
    "kv.reference": { en: "Reference", kk: "Сілтеме", ru: "Ссылка" },
    "kv.sample": { en: "Sample", kk: "Сынама", ru: "Проба" },
    "kv.system": { en: "System", kk: "Жүйе", ru: "Система" },
    "kv.id": { en: "ID", kk: "ID", ru: "ID" },
    "kv.status": { en: "Status", kk: "Мәртебесі", ru: "Статус" },
    "kv.operator": { en: "Operator", kk: "Оператор", ru: "Оператор" },
    "kv.capacity": { en: "Capacity", kk: "Қуаты", ru: "Мощность" },
    "kv.year": { en: "Year", kk: "Жылы", ru: "Год" },
    "kv.tract": { en: "Tract", kk: "Учаске", ru: "Тракт" },
    "kv.basin": { en: "Basin", kk: "Ойпат", ru: "Бассейн" },
    "kv.province": { en: "Province", kk: "Провинция", ru: "Провинция" },
    "kv.tps": { en: "Petroleum system", kk: "Мұнай-газ жүйесі", ru: "Нефтегазовая система" },
    "kv.oil": { en: "Mean oil (MMBO)", kk: "Орташа мұнай (MMBO)", ru: "Средн. нефть (MMBO)" },
    "kv.gas": { en: "Mean gas (BCFG)", kk: "Орташа газ (BCFG)", ru: "Средн. газ (BCFG)" },
    "kv.cu": { en: "Cu grade", kk: "Cu мөлшері", ru: "Содержание Cu" },
    "kv.tonnage": { en: "Tonnage", kk: "Тоннаж", ru: "Тоннаж" },
    "kv.commodity": { en: "Commodity", kk: "Пайдалы қазба", ru: "Полезное ископаемое" },
    "kv.group": { en: "Group", kk: "Топ", ru: "Группа" },
    "kv.zone": { en: "Zone", kk: "Аймақ", ru: "Зона" },
    "kv.code": { en: "Code", kk: "Код", ru: "Код" },
    "kv.area": { en: "Area", kk: "Ауданы", ru: "Площадь" },
    "kv.elevation": { en: "Elevation", kk: "Биіктік", ru: "Высота" },
    "glim.su": { en: "Unconsolidated sediments", kk: "Борпылдақ шөгінділер", ru: "Неконсолидированные отложения" },
    "glim.ss": { en: "Siliciclastic sedimentary rocks", kk: "Силицикластикалық шөгінді жыныстар", ru: "Силицикластические осадочные породы" },
    "glim.sm": { en: "Mixed sedimentary rocks", kk: "Аралас шөгінді жыныстар", ru: "Смешанные осадочные породы" },
    "glim.sc": { en: "Carbonate sedimentary rocks", kk: "Карбонатты шөгінді жыныстар", ru: "Карбонатные осадочные породы" },
    "glim.ev": { en: "Evaporites", kk: "Эвапориттер", ru: "Эвапориты" },
    "glim.vb": { en: "Basic volcanic rocks", kk: "Негізді вулкандық жыныстар", ru: "Основные вулканиты" },
    "glim.vi": { en: "Intermediate volcanic rocks", kk: "Орта құрамды вулкандық жыныстар", ru: "Средние вулканиты" },
    "glim.va": { en: "Acid volcanic rocks", kk: "Қышқыл вулкандық жыныстар", ru: "Кислые вулканиты" },
    "glim.py": { en: "Pyroclastics", kk: "Пирокластикалық жыныстар", ru: "Пирокластические породы" },
    "glim.pb": { en: "Basic plutonic rocks", kk: "Негізді плутондық жыныстар", ru: "Основные плутониты" },
    "glim.pi": { en: "Intermediate plutonic rocks", kk: "Орта құрамды плутондық жыныстар", ru: "Средние плутониты" },
    "glim.pa": { en: "Acid plutonic rocks", kk: "Қышқыл плутондық жыныстар", ru: "Кислые плутониты" },
    "glim.mt": { en: "Metamorphics", kk: "Метаморфтық жыныстар", ru: "Метаморфические породы" },
    "glim.wb": { en: "Water bodies", kk: "Су айдындары", ru: "Водные объекты" },
    "glim.ig": { en: "Ice and glaciers", kk: "Мұз бен мұздықтар", ru: "Лёд и ледники" },
    "glim.nd": { en: "No data", kk: "Дерек жоқ", ru: "Нет данных" },
    "kv.number": { en: "Number", kk: "Нөмірі", ru: "Номер" },
    "kv.issued": { en: "Issued", kk: "Берілген күні", ru: "Выдано" },
    "unit.km": { en: "km", kk: "км", ru: "км" },
    "unit.m": { en: "m", kk: "м", ru: "м" },
    "unit.ma": { en: "Ma", kk: "млн жыл", ru: "млн лет" },
    "unit.heatflow": { en: "mW/m²", kk: "мВт/м²", ru: "мВт/м²" },
    "unit.ha": { en: "ha", kk: "га", ru: "га" },
    "unit.km2": { en: "km²", kk: "км²", ru: "км²" },
    "popup.earthquake": { en: "Earthquake", kk: "Жер сілкінісі", ru: "Землетрясение" },
    "popup.unnamedDeposit": { en: "Unnamed deposit", kk: "Атаусыз кен орны", ru: "Безымянное месторождение" },
    "popup.unnamedGlacier": { en: "Unnamed glacier", kk: "Атауы жоқ мұздық", ru: "Ледник без названия" },
    "layer.licenses": { en: "Active licenses", kk: "Қолданыстағы лицензиялар", ru: "Действующие лицензии" },
    "layer.openApply": { en: "Open to apply", kk: "Өтініш қабылдауға ашық", ru: "Открыто для заявок" },
    "layer.atAuction": { en: "At auction", kk: "Аукционда", ru: "На аукционе" },
    "layer.pugfn": { en: "PUGFN: oil, gas, uranium", kk: "PUGFN: мұнай, газ, уран", ru: "ПУГФН: нефть, газ, уран" },
    "legend200.open": { en: "Legend 1:200k", kk: "Легенда 1:200 000", ru: "Легенда 1:200 000" },
    "legend200.title": { en: "Legend 1:200k", kk: "Легенда 1:200 000", ru: "Легенда 1:200 000" },
    "legend200.strat": { en: "Stratigraphy", kk: "Стратиграфия", ru: "Стратиграфия" },
    "legend200.intr": { en: "Intrusives", kk: "Интрузивтер", ru: "Интрузивы" },
    "legend200.signs": { en: "Signs", kk: "Белгілер", ru: "Знаки" },
    "legend200.search": { en: "Index", kk: "Индекс", ru: "Индекс" },
    "legend200.close": { en: "Close", kk: "Жабу", ru: "Закрыть" },
    "layer.geo200": { en: "Geological maps 1:200k", kk: "Геологиялық карталар 1:200 000", ru: "Геологические карты 1:200 000" },
    "layer.geo200Sheets": { en: "{n} sheets", kk: "{n} парақ", ru: "{n} листов" },
    "layer.orocline": { en: "Kazakhstan orocline", kk: "Қазақстан ороклині", ru: "Казахстанский ороклин" },
    "layer.itm": { en: "Itmurundy zone", kk: "Итмурунды аймағы", ru: "Зона Итмурунды" },
    "layer.subsoil": { en: "Subsoil use", kk: "Жер қойнауын пайдалану", ru: "Недропользование" },
    "leg.granitoids": { en: "U-Pb dated granitoids", kk: "U-Pb жасы бар гранитоидтар", ru: "Гранитоиды с U-Pb датировками" },
    "leg.sandstones": { en: "U-Pb dated sandstones", kk: "U-Pb жасы бар құмтастар", ru: "Песчаники с U-Pb датировками" },
    "leg.microfossils": { en: "Microfossil sites", kk: "Микрофоссилий нүктелері", ru: "Точки микрофоссилий" },
    "lic.exploration": { en: "Exploration", kk: "Барлау", ru: "Разведка" },
    "lic.extraction": { en: "Extraction", kk: "Өндіру", ru: "Добыча" },
    "lic.explExtract": { en: "Exploration and extraction", kk: "Барлау және өндіру", ru: "Разведка и добыча" },
    "lic.explContract": { en: "Exploration contract", kk: "Барлау келісімшарты", ru: "Контракт на разведку" },
    "lic.extContract": { en: "Extraction contract", kk: "Өндіру келісімшарты", ru: "Контракт на добычу" },
    "lic.bothContract": { en: "Exploration and extraction contract", kk: "Барлау және өндіру келісімшарты", ru: "Контракт на разведку и добычу" },
    "lic.revoked": { en: "Revoked", kk: "Күші жойылған", ru: "Аннулирована" },
    "lic.official": { en: "Official registry", kk: "Ресми тізілім", ru: "Официальный реестр" },
    "lic.holder": { en: "Holder record", kk: "Иелік жазбасы", ru: "Запись владельца" },
    "lic.unknown": { en: "Unknown holder", kk: "Иесі белгісіз", ru: "Владелец не указан" },
    "lic.revokedNote": { en: "This license was revoked, so it is not an active right.", kk: "Бұл лицензияның күші жойылған, сондықтан ол қолданыстағы құқық емес.", ru: "Эта лицензия аннулирована и не является действующим правом." },
    "lic.notOpen": { en: "This land already has a license or contract, so it is not open to apply.", kk: "Бұл жерде лицензия немесе келісімшарт бар, сондықтан ол өтінішке ашық емес.", ru: "На этот участок уже есть лицензия или контракт, заявки не принимаются." },
    "process.how": { en: "How to apply", kk: "Қалай өтініш беруге болады", ru: "Как подать заявку" },
    "process.howBody": { en: "Apply on e-qazyna (EPN) with an EDS. First come, unless two or more applications arrive within 15 working days of publication, then auction by subscription bonus. Max 200 blocks. Subscription bonus 100 MRP = 432,500 KZT in 2026. Term 6 years + one extension up to 5. Minimum annual spend applies.", kk: "Өтінішті e-qazyna (ЭПН) арқылы ЭЦҚ-мен беріңіз. Бірінші келгенге беріледі; жарияланғаннан кейін 15 жұмыс күні ішінде екі немесе одан көп өтініш түссе, жазылу бонусы бойынша аукцион өтеді. Көбінесе 200 блок. Жазылу бонусы 100 АЕК = 2026 жылы 432 500 теңге. Мерзімі 6 жыл және бір рет 5 жылға дейін ұзарту. Жылдық ең төменгі шығын қолданылады.", ru: "Заявку подают на e-qazyna (ЭПН) с ЭЦП. Участок достаётся первому, если за 15 рабочих дней после публикации не поступило двух и более заявок; иначе проводится аукцион по подписному бонусу. Не более 200 блоков. Подписной бонус 100 МРП = 432 500 тенге в 2026 году. Срок 6 лет и одно продление до 5 лет. Действует минимальный годовой объём затрат." },
    "process.subsoilCode": { en: "Subsoil Code", kk: "Жер қойнауы туралы кодекс", ru: "Кодекс о недрах" },
    "process.taxCode": { en: "Tax Code", kk: "Салық кодексі", ru: "Налоговый кодекс" },
    "process.openFrom": { en: "Open to apply · from 6 Nov 2026", kk: "Өтінішке ашық · 6 қараша 2026 бастап", ru: "Открыто для заявок · с 6 ноября 2026" },
    "process.auctionHeld": { en: "Auction held", kk: "Аукцион өтті", ru: "Аукцион состоялся" },
    "process.auctionLive": { en: "Auction in progress", kk: "Аукцион жүріп жатыр", ru: "Идут торги" },
    "process.auctionAnnounced": { en: "Auction announced", kk: "Аукцион жарияланды", ru: "Торги объявлены" },
    "process.auctionObject": { en: "Auction object", kk: "Аукцион нысаны", ru: "Объект аукциона" },
    "process.auctionList": { en: "Auction list", kk: "Аукцион тізімі", ru: "Список аукционов" },
    "process.hcAuction": { en: "Oil and gas auction", kk: "Мұнай-газ аукционы", ru: "Аукцион по нефти и газу" },
    "process.hcNational": { en: "Oil and gas, national companies", kk: "Мұнай мен газ, ұлттық компаниялар", ru: "Нефть и газ, национальные компании" },
    "process.uranium": { en: "Uranium", kk: "Уран", ru: "Уран" },
    "about.h1": { en: "About", kk: "Жоба туралы", ru: "О проекте" },
    "about.lead": { en: "kzgeology is a public geological map of Kazakhstan. It brings together published maps and official subsoil data so they can be read in one place, without a login.", kk: "kzgeology: Қазақстанның ашық геологиялық картасы. Мұнда жарияланған карталар мен жер қойнауын пайдаланудың ресми деректері бір жерге жинақталған, кіруді қажет етпейді.", ru: "kzgeology: открытая геологическая карта Казахстана. Здесь собраны опубликованные карты и официальные данные о недропользовании, чтобы их можно было смотреть в одном месте, без входа в систему." },
    "about.item487": { en: "Gosgeolkarta geological sheets at 1:200,000", kk: "Мемлекеттік геологиялық карта парақтары, 1:200 000", ru: "Листы Госгеолкарты, 1:200 000" },
    "about.item1967": { en: "Geological map of the Kazakh SSR at 1:1,500,000, with its fault and mineral-deposit layers", kk: "Қазақ КСР-інің геологиялық картасы, 1:1 500 000, жарылым және кен қабаттарымен", ru: "Геологическая карта Казахской ССР, 1:1 500 000, со слоями разломов и месторождений" },
    "about.itemStruct": { en: "Structural, mineral, and geoenvironmental layers", kk: "Құрылымдық, кендік және геоэкологиялық қабаттар", ru: "Структурные, минеральные и геоэкологические слои" },
    "about.itemSubsoil": { en: "Official subsoil-use and licence data", kk: "Жер қойнауын пайдалану мен лицензиялардың ресми деректері", ru: "Официальные данные о недропользовании и лицензиях" },
    "about.support": { en: "Support the project", kk: "Жобаны қолдау", ru: "Поддержать проект" },
    "about.supportBody": { en: "kzgeology is a non-profit project and is free for everyone. Sponsors help keep the maps free and bring new ones online.", kk: "kzgeology: коммерциялық емес жоба, барлығына тегін. Демеушілер карталардың тегін қалуын және жаңаларын қосуды қолдайды.", ru: "kzgeology: некоммерческий проект, бесплатный для всех. Спонсоры помогают сохранить карты открытыми и выкладывать новые." },
    "about.sponsorCta": { en: "Become a sponsor", kk: "Демеуші болу", ru: "Стать спонсором" },
    "about.cap1967": { en: "Geological map of the Kazakh SSR and adjacent territories, 1:1,500,000. All-Union Aerogeological Trust, 1967.", kk: "Қазақ КСР-і мен іргелес аумақтардың геологиялық картасы, 1:1 500 000. Бүкілодақтық аэрогеологиялық трест, 1967.", ru: "Геологическая карта Казахской ССР и сопредельных территорий, 1:1 500 000. Всесоюзный аэрогеологический трест, 1967." },
    "about.imgAlt1967": { en: "Geological map of Kazakhstan, compiled in 1967 at a scale of 1:1,500,000.", kk: "Қазақстанның геологиялық картасы, 1967 жылы 1:1 500 000 масштабта жасалған.", ru: "Геологическая карта Казахстана, составлена в 1967 году в масштабе 1:1 500 000." },
    "made.h1": { en: "How it's made", kk: "Қалай жасалды", ru: "Как это сделано" },
    "made.body": { en: "The maps begin as printed sheets and published figures. Each sheet is georeferenced, then cut into tiles so that only the area in view is loaded. Vector layers are traced from those sources and drawn over the map.", kk: "Карталар баспа парақтар мен жарияланған суреттерден басталады. Әр парақ координаталанады, содан кейін тек көріністегі бөлігі жүктелетін тақтайшаларға бөлінеді. Векторлық қабаттар сол дереккөздерден сызылып, картаға түсіріледі.", ru: "Карты начинаются с печатных листов и опубликованных рисунков. Каждый лист привязывается к координатам и нарезается на тайлы, чтобы подгружалась только видимая область. Векторные слои снимаются с этих источников и наносятся на карту." },
    "made.cap": { en: "Index of the 487 geological sheets at 1:200,000 on this map.", kk: "Осы картадағы 1:200 000 масштабтағы 487 геологиялық парақтың көрсеткіші.", ru: "Указатель 487 геологических листов масштаба 1:200 000 на этой карте." },
    "made.imgAlt": { en: "Index of the 1:200,000 geological map sheets covering Kazakhstan.", kk: "Қазақстанды қамтитын 1:200 000 геологиялық карта парақтарының көрсеткіші.", ru: "Указатель листов геологической карты 1:200 000, покрывающих Казахстан." },
    "src.h1": { en: "Sources", kk: "Дереккөздер", ru: "Источники" },
    "src.lead": { en: "The layers on this map are drawn from the following published sources.", kk: "Осы картадағы қабаттар төмендегі жария дереккөздерден алынған.", ru: "Слои этой карты основаны на следующих опубликованных источниках." },
    "src.hRegional": { en: "Regional geological maps", kk: "Аймақтық геологиялық карталар", ru: "Региональные геологические карты" },
    "src.h200k": { en: "1:200,000 sheets", kk: "1:200 000 парақтары", ru: "Листы 1:200 000" },
    "src.hDeposits": { en: "Mineral deposits and faults", kk: "Кен орындары мен жарылымдар", ru: "Месторождения и разломы" },
    "src.hUsgs": { en: "USGS assessments", kk: "USGS бағалаулары", ru: "Оценки USGS" },
    "src.hGeophys": { en: "Active faults, seismicity and geophysics", kk: "Белсенді жарылымдар, сейсмика және геофизика", ru: "Активные разломы, сейсмичность и геофизика" },
    "src.hHydro": { en: "Hydrogeology and lithology", kk: "Гидрогеология және литология", ru: "Гидрогеология и литология" },
    "src.hPapers": { en: "Research papers", kk: "Ғылыми мақалалар", ru: "Научные статьи" },
    "src.hGlacial": { en: "Glaciers and glacial landforms", kk: "Мұздықтар және мұздық бедері", ru: "Ледники и ледниковый рельеф" },
    "src.hSubsoil": { en: "Subsoil use data", kk: "Жер қойнауын пайдалану деректері", ru: "Данные о недропользовании" },
    "src.hTerrain": { en: "Terrain", kk: "Беткі рельеф", ru: "Рельеф" },
    "src.usedHere": { en: "Used here for main tectonic structures, sedimentary cover structure, historic-geological sections, and the geoenvironmental maps.", kk: "Мұнда негізгі тектоникалық құрылымдар, шөгінді жамылғы құрылымы, тарихи-геологиялық қималар және геоэкологиялық карталар үшін пайдаланылған.", ru: "Здесь использованы для основных тектонических структур, строения осадочного чехла, историко-геологических разрезов и геоэкологических карт." },
    "src.sheetsCover": { en: "487 sheets covering Kazakhstan. Scans from", kk: "Қазақстанды қамтитын 487 парақ. Скандар:", ru: "487 листов, покрывающих Казахстан. Сканы:" },
    "src.and": { en: "and", kk: "және", ru: "и" },
    "src.detailedFaults": { en: "Detailed faults and mineral deposits, digitized from All-Union Aerogeological Trust, 1967 (cited above).", kk: "Егжей-тегжейлі жарылымдар мен кен орындары, Бүкілодақтық аэрогеологиялық трестің 1967 жылғы картасынан цифрланған (жоғарыда сілтеме берілген).", ru: "Детальные разломы и месторождения, оцифрованные с карты Всесоюзного аэрогеологического треста 1967 года (ссылка выше)." },
    "src.regionalFaults": { en: "Regional faults and ore occurrences: industry compilation.", kk: "Аймақтық жарылымдар мен кен білінімдері: салалық жинақ.", ru: "Региональные разломы и рудопроявления: отраслевая сводка." },
    "src.gemSa": { en: "The Active faults layer includes GEM traces and is therefore also offered under CC BY-SA 4.0.", kk: "«Белсенді жарылымдар» қабатында GEM сызықтары бар, сондықтан ол да CC BY-SA 4.0 бойынша ұсынылады.", ru: "Слой «Активные разломы» включает линии GEM и поэтому также распространяется на условиях CC BY-SA 4.0." },
    "src.comcatSnap": { en: "Events of magnitude 3.0 and greater in the Kazakhstan region, 1 January 1900 to 26 November 2026. Snapshot downloaded 27 November 2026.", kk: "Қазақстан өңіріндегі магнитудасы 3,0 және одан жоғары оқиғалар, 1900 жылғы 1 қаңтардан 2026 жылғы 26 қарашаға дейін. Көшірме 2026 жылғы 27 қарашада жүктелген.", ru: "События магнитудой 3,0 и выше в регионе Казахстана, с 1 января 1900 года по 26 ноября 2026 года. Снимок скачан 27 ноября 2026 года." },
    "src.wbNote": { en: "The map shows the 475-year return period (10% probability of exceedance in 50 years) from the open catalog files, not the later restricted GEM 2025 model.", kk: "Картада ашық каталог файлдарынан алынған 475 жылдық қайталану кезеңі көрсетілген (50 жылда 10% асу ықтималдығы), кейінгі шектеулі GEM 2025 моделі емес.", ru: "На карте показан период повторяемости 475 лет (вероятность превышения 10% за 50 лет) по открытым файлам каталога, а не более поздняя закрытая модель GEM 2025." },
    "src.notNav": { en: "Not for navigation.", kk: "Навигацияға арналмаған.", ru: "Не для навигации." },
    "src.subsoilPlatform": { en: "Unified Subsoil Use Platform (licences and subsoil use):", kk: "Жер қойнауын пайдаланудың бірыңғай платформасы (лицензиялар мен жер қойнауын пайдалану):", ru: "Единая платформа недропользования (лицензии и недропользование):" },
    "src.pugfnFrom": { en: "PUGFN (oil, gas, uranium), from the same platform:", kk: "PUGFN (мұнай, газ, уран), сол платформадан:", ru: "ПУГФН (нефть, газ, уран) с той же платформы:" },
    "src.contractsMap": { en: "contracts map", kk: "келісімшарттар картасы", ru: "карта контрактов" },
    "src.nedra": { en: "Geological maps listed on", kk: "Геологиялық карталар тізімі:", ru: "Геологические карты на" },
    "src.terrain": { en: "Mapzen / AWS Terrain Tiles via AWS Open Data. Elevation data courtesy of the U.S. Geological Survey (SRTM, GMTED2010) and NOAA (ETOPO1).", kk: "Mapzen / AWS Terrain Tiles, AWS Open Data арқылы. Биіктік деректері: U.S. Geological Survey (SRTM, GMTED2010) және NOAA (ETOPO1).", ru: "Mapzen / AWS Terrain Tiles через AWS Open Data. Данные высот предоставлены U.S. Geological Survey (SRTM, GMTED2010) и NOAA (ETOPO1)." },
    "contrib.h1": { en: "Contribute", kk: "Үлес қосу", ru: "Участие" },
    "contrib.lead": { en: "You can add a map to this project, or ask for one to be taken down.", kk: "Жобаға карта қоса аласыз немесе картаны алып тастауды сұрай аласыз.", ru: "Вы можете добавить карту в проект или попросить убрать её." },
    "contrib.hIndiv": { en: "Individuals", kk: "Жеке адамдар", ru: "Частные лица" },
    "contrib.indiv": { en: "If you have the right to share a map, submit it with the Donate maps form. Each submission is reviewed before it is added.", kk: "Картаны бөлісуге құқығыңыз болса, оны «Карта ұсыну» формасы арқылы жіберіңіз. Әр ұсыныс қосылмас бұрын қаралады.", ru: "Если вы вправе передать карту, отправьте её через форму «Предложить карту». Каждая заявка рассматривается до включения." },
    "contrib.hInst": { en: "Institutions", kk: "Мекемелер", ru: "Организации" },
    "contrib.inst": { en: "Mining companies, geological surveys, and other institutions may contribute maps or datasets. Work that is included will be credited. Use the same form and name the institution in the note.", kk: "Кен компаниялары, геологиялық қызметтер және басқа мекемелер карта немесе деректер жиынын ұсына алады. Қабылданған жұмысқа сілтеме беріледі. Сол форманы пайдаланып, ескертпеде мекеме атауын көрсетіңіз.", ru: "Горные компании, геологические службы и другие организации могут передавать карты и наборы данных. Включённые материалы будут указаны с атрибуцией. Используйте ту же форму и назовите организацию в примечании." },
    "contrib.hCopy": { en: "Copyright", kk: "Авторлық құқық", ru: "Авторские права" },
    "contrib.copy": { en: "If you hold rights in a map or dataset on this site and believe it should not be shown, please write through the form. It will be removed on request.", kk: "Егер осы сайттағы картаға немесе деректер жиынына құқығыңыз болса және оны көрсетуге болмайды деп санасаңыз, форма арқылы жазыңыз. Өтініш бойынша алып тасталады.", ru: "Если вы обладаете правами на карту или набор данных на этом сайте и считаете, что их не следует показывать, напишите через форму. По просьбе материал будет удалён." },
    "code.h1": { en: "Open source", kk: "Ашық код", ru: "Исходный код" },
    "code.lead": { en: "The code that runs this site is public. The map data are hosted separately.", kk: "Осы сайтты басқаратын код ашық. Карта деректері бөлек сақталады.", ru: "Код, на котором работает сайт, открыт. Данные карт хранятся отдельно." },
    "code.cta": { en: "View the code on GitHub", kk: "Кодты GitHub-та қарау", ru: "Смотреть код на GitHub" },
    "authors.h1": { en: "Authors", kk: "Авторлар", ru: "Авторы" },
    "authors.thanks": { en: "Many thanks to contributors:", kk: "Үлес қосқандарға көп рақмет:", ru: "Большое спасибо участникам:" },
    "authors.others": { en: "and others.", kk: "және басқалар.", ru: "и другим." },
    "login.lead": { en: "Private. Enter the password to continue.", kk: "Жабық бөлім. Жалғастыру үшін құпиясөзді енгізіңіз.", ru: "Закрытый раздел. Введите пароль, чтобы продолжить." },
    "login.password": { en: "Password", kk: "Құпиясөз", ru: "Пароль" },
    "login.enter": { en: "Enter", kk: "Кіру", ru: "Войти" },
    "login.wrong": { en: "Wrong password.", kk: "Құпиясөз қате.", ru: "Неверный пароль." },
    "note.activeFaults": { en: "Dashed lines are inferred or uncertain traces. The layer includes GEM traces and is offered under CC BY-SA 4.0.", kk: "Үзік сызықтар: болжанған немесе сенімсіз трассалар. Қабатта GEM сызықтары бар, ол CC BY-SA 4.0 бойынша ұсынылады.", ru: "Пунктир: предполагаемые или неуверенные линии. Слой включает трассы GEM и распространяется на условиях CC BY-SA 4.0." },
    "note.quakes": { en: "Circle size shows magnitude. USGS ComCat snapshot, 27 November 2026.", kk: "Шеңбер мөлшері магнитуданы көрсетеді. USGS ComCat көшірмесі, 27 қараша 2026.", ru: "Размер кружка показывает магнитуду. Снимок USGS ComCat, 27 ноября 2026 года." },
    "ramp.pga": { en: "Peak ground acceleration, 475-year return period", kk: "Жер бетінің ең жоғары үдеуі, 475 жылдық қайталану кезеңі", ru: "Пиковое ускорение грунта, период повторяемости 475 лет" },
    "ramp.emag": { en: "Magnetic anomaly, upward continued to 4 km", kk: "Магниттік аномалия, 4 км-ге көтеріліп жалғастырылған", ru: "Магнитная аномалия, пересчитанная на высоту 4 км" },
    "dir.N": { en: "N", kk: "С", ru: "С" },
    "dir.S": { en: "S", kk: "О", ru: "Ю" },
    "dir.E": { en: "E", kk: "Ш", ru: "В" },
    "dir.W": { en: "W", kk: "Б", ru: "З" }
  };

  var current = 'en';
  var listeners = [];

  function normalize(v) {
    v = String(v || '').toLowerCase().replace('_', '-');
    if (v === 'kz') v = 'kk';
    var short = v.split('-')[0];
    return LANGS[short] ? short : null;
  }

  function t(key, vars) {
    var row = STR[key];
    var s = (row && (row[current] || row.en)) || key;
    if (vars) {
      Object.keys(vars).forEach(function (k) {
        s = s.split('{' + k + '}').join(String(vars[k]));
      });
    }
    return s;
  }

  function pick(obj, field) {
    if (!obj) return '';
    var langField = field + '_' + current;
    if (current !== 'en' && obj[langField]) return obj[langField];
    var alt = current !== 'en' ? obj['name_' + current] : null;
    if (field === 'title' && current !== 'en' && obj['name_' + current]) return obj['name_' + current];
    return obj[field] || obj.name || '';
  }

  function pickLegend(entry) {
    if (!entry) return '';
    if (current !== 'en' && entry['l_' + current]) return entry['l_' + current];
    return entry.l || entry.label || '';
  }

  function apply(root) {
    root = root || document;
    root.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      var attr = el.getAttribute('data-i18n-attr');
      var val = t(key);
      if (attr) el.setAttribute(attr, val);
      else el.textContent = val;
    });
    root.querySelectorAll('[data-i18n-html]').forEach(function (el) {
      el.innerHTML = t(el.getAttribute('data-i18n-html'));
    });
    root.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
      el.setAttribute('placeholder', t(el.getAttribute('data-i18n-placeholder')));
    });
    root.querySelectorAll('[data-i18n-aria]').forEach(function (el) {
      el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria')));
    });
    root.querySelectorAll('[data-i18n-title]').forEach(function (el) {
      el.setAttribute('title', t(el.getAttribute('data-i18n-title')));
    });
  }

  var SPA_PAGES = { '/': 1, '/about': 1, '/about/made': 1, '/sources': 1, '/contribute': 1, '/open-source': 1, '/authors': 1 };
  var LANG_PATH = /^\/(ru|kk)(?=\/|$)/;

  function publicSite() {
    return !!(global.ATLAS_SITE && global.ATLAS_SITE.mode === 'public');
  }

  function barePath(p) {
    p = String(p || '/').replace(LANG_PATH, '') || '/';
    if (p.length > 1) p = p.replace(/\/+$/, '');
    return p || '/';
  }

  // The public site has real language URLs (/ru/, /kk/). Elsewhere the language stays in ?lang=.
  function writeParam(lang) {
    try {
      var u = new URL(location.href);
      if (publicSite() && SPA_PAGES[barePath(u.pathname)]) {
        var rest = u.pathname.replace(LANG_PATH, '') || '/';
        u.pathname = (lang === 'en' ? '' : '/' + lang) + rest;
        u.searchParams.delete('lang');
      } else {
        u.searchParams.set('lang', lang);
      }
      history.replaceState(null, '', u.pathname + u.search + u.hash);
    } catch (e) {}
  }

  function syncSwitch() {
    document.querySelectorAll('.lang-switch [data-lang]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-lang') === current));
    });
  }

  function setLang(lang, opts) {
    lang = normalize(lang) || 'en';
    current = lang;
    try { localStorage.setItem(STORAGE, lang); } catch (e) {}
    document.documentElement.lang = lang === 'kk' ? 'kk' : lang;
    if (!opts || opts.updateUrl !== false) writeParam(lang);
    apply(document);
    syncSwitch();
    var north = document.querySelector('#map-north text');
    if (north) north.textContent = t('dir.N');
    listeners.forEach(function (fn) { try { fn(lang); } catch (e) {} });
  }

  function detect() {
    try {
      var pm = LANG_PATH.exec(location.pathname);
      if (pm && publicSite()) return { lang: pm[1], persist: true, url: false };
    } catch (e) {}
    try {
      var q = new URLSearchParams(location.search).get('lang');
      var fromQ = normalize(q);
      if (fromQ) return { lang: fromQ, persist: true, url: true };
    } catch (e) {}
    try {
      var stored = normalize(localStorage.getItem(STORAGE));
      if (stored) return { lang: stored, persist: false, url: false };
    } catch (e) {}
    try {
      var nav = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language];
      for (var i = 0; i < nav.length; i++) {
        var n = normalize(nav[i]);
        if (n === 'ru' || n === 'kk') return { lang: n, persist: true, url: true };
      }
    } catch (e) {}
    return { lang: 'en', persist: true, url: false };
  }

  function onChange(fn) { listeners.push(fn); }

  function placeNav() {
    var menu = document.getElementById('site-nav');
    var bar = document.querySelector('.topbar');
    var donate = document.getElementById('donate-btn');
    var play = document.getElementById('play-btn');
    var toggle = document.getElementById('nav-toggle');
    var lang = bar && bar.querySelector('.lang-switch');
    var logout = document.getElementById('logout-btn') || document.querySelector('a[href="/__auth/logout"]');
    if (!menu || !donate || !play || !bar) return;
    var phone = window.matchMedia && window.matchMedia('(max-width:700px)').matches;
    if (phone) {
      if (donate.parentNode !== menu) menu.appendChild(donate);
      if (logout && logout.parentNode !== menu) menu.appendChild(logout);
      if (lang && lang.parentNode !== menu) menu.appendChild(lang);
    } else {
      menu.classList.remove('open');
      if (toggle) toggle.setAttribute('aria-expanded', 'false');
      if (donate.parentNode !== bar || donate.nextElementSibling !== play) bar.insertBefore(donate, play);
      if (logout && logout.parentNode) bar.insertBefore(logout, toggle || menu);
      if (lang && lang.parentNode !== bar) bar.appendChild(lang);
    }
  }

  function initNav() {
    var toggle = document.getElementById('nav-toggle');
    var nav = document.getElementById('site-nav');
    placeNav();
    if (window.matchMedia) {
      var mq = window.matchMedia('(max-width:700px)');
      if (mq.addEventListener) mq.addEventListener('change', placeNav);
      else if (mq.addListener) mq.addListener(placeNav);
    }
    if (toggle && nav) {
      function close() {
        nav.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      }
      toggle.addEventListener('click', function (e) {
        e.stopPropagation();
        var open = !nav.classList.contains('open');
        nav.classList.toggle('open', open);
        toggle.setAttribute('aria-expanded', String(open));
      });
      document.addEventListener('click', function (e) {
        if (!nav.contains(e.target) && e.target !== toggle) close();
      });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    }
    document.querySelectorAll('.lang-switch [data-lang]').forEach(function (b) {
      b.addEventListener('click', function () { setLang(b.getAttribute('data-lang')); });
    });
  }

  var found = detect();
  current = found.lang;
  try { if (found.persist) localStorage.setItem(STORAGE, current); } catch (e) {}
  document.documentElement.lang = current === 'kk' ? 'kk' : current;
  if (found.url) writeParam(current);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { apply(document); syncSwitch(); initNav(); });
  } else {
    apply(document); syncSwitch(); initNav();
  }

  global.atlasI18n = { t: t, pick: pick, pickLegend: pickLegend, lang: function () { return current; }, setLang: setLang, apply: apply, onChange: onChange, STR: STR };
})(window);

