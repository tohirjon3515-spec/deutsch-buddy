import React, { useState } from 'react';
import { BookOpen, Sparkles, ChevronDown, ChevronUp, Copy, Check, ArrowRight } from 'lucide-react';
import { Language, translations } from '../translations';

interface B2ToolkitProps {
  language?: Language;
  onSelectExample: (text: string) => void;
}

interface B2Item {
  structure: string;
  meaningUz: string;
  meaningEn: string;
  example: string;
  category: 'nvv' | 'connectors' | 'passive' | 'argumentation';
}

const B2_ITEMS: B2Item[] = [
  // 1. Nomen-Verb-Verbindungen (NVV)
  {
    structure: "in Betracht ziehen",
    meaningUz: "hisobga olmoq, e'tiborga olmoq",
    meaningEn: "to take into consideration",
    example: "Wir müssen alle wirtschaftlichen Faktoren in Betracht ziehen.",
    category: 'nvv'
  },
  {
    structure: "zur Verfügung stehen",
    meaningUz: "ixtiyorida bo'lmoq, mavjud bo'lmoq",
    meaningEn: "to be available at one's disposal",
    example: "Für dieses Forschungsprojekt stehen ausreichende finanzielle Mittel zur Verfügung.",
    category: 'nvv'
  },
  {
    structure: "eine Entscheidung treffen",
    meaningUz: "muhim qaror qabul qilmoq",
    meaningEn: "to make a decision",
    example: "Nach reiflicher Überlegung hat die Geschäftsleitung eine wegweisende Entscheidung getroffen.",
    category: 'nvv'
  },
  {
    structure: "zum Ausdruck bringen",
    meaningUz: "o'z fikri yoki hissini ifodalamoq",
    meaningEn: "to express (feelings, gratitude, interest)",
    example: "Ich möchte mein großes Interesse an der ausgeschriebenen Position zum Ausdruck bringen.",
    category: 'nvv'
  },
  {
    structure: "in Frage kommen",
    meaningUz: "ko'rib chiqilishi mumkin bo'lmoq / to'g'ri kelmoq",
    meaningEn: "to come into question, be an option",
    example: "Ein vorzeitiger Abbruch des Studiums kommt für mich keinesfalls in Frage.",
    category: 'nvv'
  },
  {
    structure: "Kritik üben an + Dat",
    meaningUz: "biror narsani asosli tanqid qilmoq",
    meaningEn: "to voice criticism against",
    example: "Zahlreiche Experten üben berechtigte Kritik an den neuen Richtlinien.",
    category: 'nvv'
  },
  {
    structure: "in Anspruch nehmen",
    meaningUz: "xizmat yoki vaqtdan foydalanmoq",
    meaningEn: "to make use of, to take up time/resources",
    example: "Viele Studierende nehmen die psychologische Beratung der Universität in Anspruch.",
    category: 'nvv'
  },

  // 2. Zweiteilige Konnektoren
  {
    structure: "sowohl ... als auch",
    meaningUz: "ham ... ham (ijobiy qo'shilish)",
    meaningEn: "both ... and (copulative)",
    example: "Dieser Beruf erfordert sowohl fundierte Fachkenntnisse als auch soziale Kompetenz.",
    category: 'connectors'
  },
  {
    structure: "nicht nur ... sondern auch",
    meaningUz: "nafaqat ... balki ... ham (kuchaytirilgan)",
    meaningEn: "not only ... but also",
    example: "Die Weiterbildung vermittelt nicht nur theoretisches Wissen, sondern auch wertvolle Praxis.",
    category: 'connectors'
  },
  {
    structure: "weder ... noch",
    meaningUz: "na ... va na ... (inkor)",
    meaningEn: "neither ... nor",
    example: "Der vorgelegte Plan ist weder kostengünstig noch ökologisch tragbar.",
    category: 'connectors'
  },
  {
    structure: "einerseits ... andererseits",
    meaningUz: "bir tomondan ... boshqa tomondan (taqqoslash)",
    meaningEn: "on the one hand ... on the other hand",
    example: "Einerseits bietet die Stadt viele Vorteile, andererseits sind die Mieten extrem hoch.",
    category: 'connectors'
  },
  {
    structure: "je ... desto / umso",
    meaningUz: "qanchalik ... shunchalik (proporsional)",
    meaningEn: "the more ... the more",
    example: "Je intensiver man die deutsche Grammatik übt, desto leichter fällt das Bestehen der B2-Prüfung.",
    category: 'connectors'
  },
  {
    structure: "zwar ... aber",
    meaningUz: "to'g'ri / garchi ... ammo",
    meaningEn: "admittedly ... but",
    example: "Die Aufgabe ist zwar äußerst anspruchsvoll, aber mit Teamgeist durchaus lösbar.",
    category: 'connectors'
  },

  // 3. Passiv-Ersatzformen
  {
    structure: "sich lassen + Infinitiv",
    meaningUz: "qilsa bo'ladi / imkoni bor (kann gemacht werden)",
    meaningEn: "can be done (passive replacement)",
    example: "Die komplexen Zusammenhänge lassen sich anhand konkreter Beispiele leicht erklären.",
    category: 'passive'
  },
  {
    structure: "sein + zu + Infinitiv",
    meaningUz: "qilinishi kerak / lozim (muss gemacht werden)",
    meaningEn: "must/can be done (formal obligation)",
    example: "Die Antragsunterlagen sind bis zum Ende des Monats vollständig einzureichen.",
    category: 'passive'
  },
  {
    structure: "Adjektive auf -bar / -lich",
    meaningUz: "bajarilishi mumkin bo'lgan sifatlar",
    meaningEn: "-able adjectives (passive meaning)",
    example: "Eine friedliche Lösung des Konflikts ist unter diesen Bedingungen durchaus denkbar und machbar.",
    category: 'passive'
  },

  // 4. B2 Argumentation & Redemittel
  {
    structure: "Es steht außer Frage, dass...",
    meaningUz: "Shubhasizki / Bunga shubha yo'qki",
    meaningEn: "It is beyond question that...",
    example: "Es steht außer Frage, dass erneuerbare Energien für die Zukunft unerlässlich sind.",
    category: 'argumentation'
  },
  {
    structure: "Ich vertrete den Standpunkt, dass...",
    meaningUz: "Men shunday nuqtai nazardamanki...",
    meaningEn: "I take the stance that...",
    example: "Ich vertrete den Standpunkt, dass lebenslanges Lernen in der modernen Gesellschaft essenziell ist.",
    category: 'argumentation'
  },
  {
    structure: "Ein wesentlicher Vorteil besteht darin, dass...",
    meaningUz: "Asosiy afzalligi shundan iboratki...",
    meaningEn: "A key advantage lies in the fact that...",
    example: "Ein wesentlicher Vorteil besteht darin, dass flexible Arbeitszeiten die Produktivität steigern.",
    category: 'argumentation'
  },
  {
    structure: "Zusammenfassend lässt sich festhalten, dass...",
    meaningUz: "Xulosa qilib aytganda shuni ta'kidlash mumkinki...",
    meaningEn: "In conclusion, it can be stated that...",
    example: "Zusammenfassend lässt sich festhalten, dass die Vorteile die potenziellen Risiken deutlich überwiegen.",
    category: 'argumentation'
  }
];

export const B2Toolkit: React.FC<B2ToolkitProps> = ({ language = 'uz', onSelectExample }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'nvv' | 'connectors' | 'passive' | 'argumentation'>('nvv');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const t = translations[language];

  const filteredItems = B2_ITEMS.filter(item => item.category === activeTab);

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="rounded-2xl border border-indigo-100 dark:border-indigo-900/40 bg-gradient-to-br from-indigo-50/50 via-white to-violet-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-indigo-950/20 shadow-sm overflow-hidden transition-all duration-300">
      {/* Header bar / Toggle */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-3 cursor-pointer flex items-center justify-between hover:bg-indigo-50/40 dark:hover:bg-slate-800/40 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-indigo-600 text-white shadow-sm">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-100">
                {t.b2ToolkitTitle}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300 uppercase tracking-wider">
                Goethe / telc B2
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
              {t.b2ToolkitSubtitle}
            </p>
          </div>
        </div>

        <button 
          type="button"
          className="flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 p-1.5 hover:bg-indigo-100/50 dark:hover:bg-indigo-900/40 rounded-lg transition-colors"
        >
          <span className="hidden md:inline">{isOpen ? (language === 'uz' ? 'Yopish' : 'Collapse') : (language === 'uz' ? 'Ochish & Ko\'rish' : 'Expand & Explore')}</span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Expanded Content */}
      {isOpen && (
        <div className="px-4 pb-4 pt-1 border-t border-indigo-100/60 dark:border-slate-800 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 mb-3 pt-2">
            <button
              type="button"
              onClick={() => setActiveTab('nvv')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'nvv'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-indigo-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {t.tabNVV} ({B2_ITEMS.filter(i => i.category === 'nvv').length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('connectors')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'connectors'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-indigo-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {t.tabConnectors} ({B2_ITEMS.filter(i => i.category === 'connectors').length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('passive')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'passive'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-indigo-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {t.tabPassive} ({B2_ITEMS.filter(i => i.category === 'passive').length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('argumentation')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'argumentation'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-indigo-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {t.tabArgumentation} ({B2_ITEMS.filter(i => i.category === 'argumentation').length})
            </button>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
            {filteredItems.map((item, idx) => (
              <div
                key={idx}
                className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 flex flex-col justify-between hover:border-indigo-300 dark:hover:border-indigo-700 transition-all shadow-xs group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <span className="text-sm font-black text-indigo-700 dark:text-indigo-400 group-hover:text-indigo-600 transition-colors">
                      {item.structure}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(item.example, idx)}
                      title="Nusxalash / Copy"
                      className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      {copiedIndex === idx ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-2">
                    {language === 'uz' ? item.meaningUz : item.meaningEn}
                  </p>

                  <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800 mb-2.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                      B2 Kontekst:
                    </span>
                    <p className="text-xs text-slate-800 dark:text-slate-200 italic leading-relaxed">
                      "{item.example}"
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectExample(item.example)}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-600 hover:text-white text-indigo-700 dark:text-indigo-300 text-xs font-bold transition-all active:scale-98"
                >
                  <span>{language === 'uz' ? 'Tahlilga qo\'yish' : 'Insert & Analyze'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
