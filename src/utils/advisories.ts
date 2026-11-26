import type { AQIData } from '../types';
import { getCPCBScaleCategory } from './aqi';

export type AdvisoryAudience = 'rwa' | 'family' | 'school';
export type AdvisoryLanguage = 'en' | 'hi';

interface AdvisoryTemplate {
  titlePrefix: string;
  sectionHeading: string;
  bullets: string[];
}

const TEMPLATES: Record<AdvisoryLanguage, {
  signOff: string;
  audiences: Record<AdvisoryAudience, AdvisoryTemplate>;
}> = {
  hi: {
    signOff: '— *वायुकेयर वायुमंडलीय सतर्कता प्रभाग*',
    audiences: {
      school: {
        titlePrefix: 'वायुकेयर विद्यालय व अभिभावक वायु सतर्कता बुलेटिन',
        sectionHeading: 'छात्रों और विद्यालय हेतु अनिवार्य सुरक्षा निर्देश:',
        bullets: [
          'सुबह की स्कूल बस व वैन यात्रा में सभी विद्यार्थियों को N95 मास्क पहनना अनिवार्य करें',
          'सुबह की आउटडोर प्रार्थना सभा और पीटी (खेलकूद) अभ्यास तुरंत प्रभाव से स्थगित करें',
          'मॉर्निंग इनवर्जन के दौरान कक्षाओं के दरवाजे और खिड़कियां पूरी तरह बंद रखें',
          'सांस की तकलीफ या अस्थमा से पीड़ित बच्चों को इनहेलर साथ रखने का निर्देश दें',
        ],
      },
      family: {
        titlePrefix: 'वायुकेयर घरेलू व वरिष्ठ नागरिक स्वास्थ्य परामर्श',
        sectionHeading: 'परिवार और बुजुर्गों के लिए सुरक्षा उपाय:',
        bullets: [
          'वरिष्ठ नागरिक सुबह और शाम की सैर दोपहर 12 बजे तक के लिए टालें',
          'अस्थमा व सांस के मरीज आपातकालीन इनहेलर हमेशा अपने पास रखें',
          'बेडरूम में एयर प्यूरीफायर को ऑटो/हाई मोड पर चलाएं और खिड़कियां सील रखें',
          'घर में धूल उड़ने से रोकने के लिए दिन में दो बार पानी से गीला पोछा लगाएं',
        ],
      },
      rwa: {
        titlePrefix: 'वायुकेयर आरडब्ल्यूए (RWA) आवासीय सोसायटी एडवाइजरी',
        sectionHeading: 'सोसायटी निवासियों व प्रबंधन हेतु आवश्यक सावधानियां:',
        bullets: [
          'सुरक्षा गार्ड्स और मेंटेनेंस कर्मचारियों को तुरंत N95 मास्क वितरित करें',
          'सोसायटी परिसर और रास्तों पर सूखी झाड़ू न लगाएं; केवल पानी का छिड़काव करें',
          'सूखे पत्तों, बागवानी कचरे और अलाव जलाने पर पूर्ण प्रतिबंध लगाएं',
          'क्लबहाउस में बुजुर्गों और बच्चों के लिए स्वच्छ वायु क्षेत्र (Clean Air Zone) उपलब्ध कराएं',
        ],
      },
    },
  },
  en: {
    signOff: '— *VayuCare Atmospheric Intelligence*',
    audiences: {
      school: {
        titlePrefix: 'VayuCare School & Parents Health Bulletin',
        sectionHeading: 'Mandatory Safety Protocols for Students & Staff:',
        bullets: [
          'Enforce snug N95 masks for all students during morning school bus & van commutes',
          'Suspend outdoor morning assemblies and physical education (PT) drills immediately',
          'Keep classroom doors and windows firmly closed during early morning inversion peak',
          'Alert parents of asthmatic children to keep prescription rescue inhalers in school bags',
        ],
      },
      family: {
        titlePrefix: 'VayuCare Household & Elder Health Advisory',
        sectionHeading: 'Priority Safeguards for Families & Vulnerable Members:',
        bullets: [
          'Postpone senior citizen morning balcony walks until thermal mixing after 12:00 PM',
          "Keep prescribed bronchodilators and asthma medication within arm's reach",
          'Run bedroom HEPA air purifiers continuously and seal roadside drafts with door snakes',
          'Wet-mop floors twice daily with water rather than sweeping to capture settled soot',
        ],
      },
      rwa: {
        titlePrefix: 'VayuCare Neighborhood RWA Advisory',
        sectionHeading: 'Community Safeguards for Society Management & Residents:',
        bullets: [
          'Distribute N95 masks to outdoor security guards, maintenance staff, and gardeners',
          'Mandate water-sprinkling on society driveways; strictly ban dry sweeping of dust',
          'Enforce zero tolerance against open leaf, garbage, or biomass burning in the perimeter',
          'Keep clubhouse and community indoor halls sealed as clean-air safe spaces for elders',
        ],
      },
    },
  },
};

export function buildFallbackAdvisory(
  aqiData: AQIData,
  audience: AdvisoryAudience,
  language: AdvisoryLanguage
): string {
  const cpcbCat = getCPCBScaleCategory(aqiData.aqi);
  const station = aqiData.stationName || `${aqiData.city} Sensor`;
  const bundle = TEMPLATES[language];
  const tpl = bundle.audiences[audience];
  const bullets = tpl.bullets.map(b => `• ${b}`).join('\n');

  if (language === 'hi') {
    return (
      `*${tpl.titlePrefix} — ${aqiData.city}*\n\n` +
      `*वर्तमान एक्यूआई (IND-AQI): ${aqiData.aqi} (${cpcbCat})*\n` +
      `*पीएम 2.5 सांद्रता: ${aqiData.pm25 ?? '—'} µg/m³* | स्टेशन: ${station}\n\n` +
      `*${tpl.sectionHeading}*\n` +
      `${bullets}\n\n` +
      `${bundle.signOff}`
    );
  }

  return (
    `*${tpl.titlePrefix} — ${aqiData.city}*\n\n` +
    `*Current IND-AQI: ${aqiData.aqi} (${cpcbCat})*\n` +
    `*Fine PM2.5 Level: ${aqiData.pm25 ?? '—'} µg/m³* | Station: ${station}\n\n` +
    `*${tpl.sectionHeading}*\n` +
    `${bullets}\n\n` +
    `${bundle.signOff}`
  );
}
