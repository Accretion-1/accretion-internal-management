const ocrdata = [
  {
    "id": 1,
    "name": "GST Annexure",
    "documentType": "GST_ANNEXURE_A",
    "language": "en",
    "matchThreshold": 0.75,
    "requiredFields": {
      "gstNumber": "23AAACL6442L1Z1",
      "legalName": "ULTRATECH CEMENT LIMITED"
    },
    "optionalFields": {
      "tradeName": "ULTRA TECH CEMENT LIMITED",
      "totalAdditionalPlaces": "362"
    },
    "keywords": [
      "ANNEXURE A",
      "GOODS AND SERVICES TAX IDENTIFICATION NUMBER",
      "DETAILS OF ADDITIONAL PLACE OF BUSINESS",
      "MADHYA PRADESH",
      "BIJORI",
      "BADWARA",
      "KATNI",
      "LASUDIA MORI",
      "INDORE",
      "PALDA",
      "SUPER CORRIDOR",
      "GOVINDPURA",
      "BHOPAL",
      "SATNA",
      "JABALPUR",
      "GWALIOR",
      "GUNA",
      "RATLAM",
      "SAGAR"
    ]
  },
  {
    "id": 2,
    "name": "GST Registration Certificate",
    "documentType": "GST_REGISTRATION_CERTIFICATE",
    "language": "en",
    "matchThreshold": 0.80,
    "requiredFields": {
      "gstNumber": "23AAACL6442L1Z1",
      "legalName": "ULTRATECH CEMENT LIMITED"
    },
    "optionalFields": {
      "tradeName": "ULTRA TECH CEMENT LIMITED",
      "constitution": "PUBLIC LIMITED COMPANY",
      "registrationType": "REGULAR",
      "district": "NEEMUCH",
      "state": "MADHYA PRADESH",
      "pinCode": "458470"
    },
    "keywords": [
      "GOVERNMENT OF INDIA",
      "GST REG-06",
      "REGISTRATION CERTIFICATE",
      "UNIT VIKRAM CEMENT WORKS",
      "VIKRAM NAGAR",
      "KHOR",
      "EKTA SONI",
      "UJJAIN-2"
    ]
  },
  {
    "id": 3,
    "name": "UltraTech Storage Guideline",
    "documentType": "ULTRATECH_STORAGE_GUIDELINE",
    "language": "hi",
    "matchThreshold": 0.70,
    "requiredFields": {
      "brand": "अल्ट्राटेक सीमेंट"
    },
    "optionalFields": {
      "title": "सीमेंट के गुण और मजबूती की रक्षा करने के लिए इन नियमों का पालन करें"
    },
    "keywords": [
      "देश का नं.1 सीमेंट",
      "सूखा स्थान",
      "नमी",
      "30 सेमी",
      "60 सेमी",
      "15 बोरियां",
      "FIRST IN FIRST OUT",
      "तिरपाल",
      "गोदाम",
      "खिड़कियां",
      "दरवाजे"
    ]
  },
  {
  "id": 4,
  "name": "UltraTech Office Information Board",
  "documentType": "ULTRATECH_OFFICE_INFORMATION",
  "language": "en",
  "matchThreshold": 0.95,
  "requiredFields": {
    "brand": "UltraTech Cement",
    "gstNumber": "23AAACL6442L1Z1",
    "cin": "L26940MH2000PLC128420"
  },
  "optionalFields": {
    "tagline": "The Engineer's Choice",
    "parentCompany": "Aditya Birla",
    "godownLocation": "Pandhurna, Madhya Pradesh",
    "regionalOffice": "Jabalpur, Madhya Pradesh",
    "zonalOffice": "Lucknow, Uttar Pradesh",
    "registeredOffice": "Mumbai, Maharashtra"
  },
  "addressDetails": {
    "godown": {
      "company": "UltraTech Cement Ltd.",
      "careOf": "Pankaj Bambal",
      "address": "64/2, (S)64/2, 65/2, Nandpur, Pandhurna Industrial Area",
      "city": "Pandhurna",
      "state": "Madhya Pradesh",
      "pinCode": "480334"
    },
    "regionalOffice": {
      "company": "UltraTech Cement Ltd.",
      "division": "Cement Marketing Division",
      "floor": "3rd Floor",
      "address": "Niwarganj Extension Corporation Lease Plot No. 74 & 75 & part of House No. 804 & 805, Pandit Bhawani Prasad Ward, Gole Bazar",
      "city": "Jabalpur",
      "state": "Madhya Pradesh",
      "pinCode": "482002"
    },
    "zonalOffice": {
      "company": "UltraTech Cement Ltd.",
      "floor": "7th Floor",
      "building": "Cyber Heights",
      "locality": "Vibhuti Khand, Gomti Nagar",
      "city": "Lucknow",
      "state": "Uttar Pradesh",
      "pinCode": "226010"
    },
    "registeredOffice": {
      "company": "UltraTech Cement Ltd.",
      "address": "Ahura Centre, B Wing, 2nd Floor, MIDC, Mahakali Caves Road, Andheri (E)",
      "city": "Mumbai",
      "state": "Maharashtra",
      "pinCode": "400093"
    }
  },
  "keywords": [
    "UltraTech Cement",
    "The Engineer's Choice",
    "Aditya Birla",
    "Godown",
    "Regional Office",
    "Zonal Office",
    "Registered Office",
    "Pandhurna",
    "Jabalpur",
    "Lucknow",
    "Mumbai",
    "GSTN",
    "23AAACL6442L1Z1",
    "CIN",
    "L26940MH2000PLC128420"
  ]
},
{
  "id": 5,
  "name": "UltraTech Cement Dealer Board",
  "documentType": "ULTRATECH_DEALER_BOARD",
  "language": "hi-en",
  "matchThreshold": 0.92,
  "requiredFields": {
    "brand": "ULTRATECH CEMENT",
    "gstNumber": "23AAACL6442L1Z1",
    "cin": "L26940MH2000PLC128420"
  },
  "optionalFields": {
    "taglineHindi": "इंजीनियर की पसंद",
    "taglineEnglish": "The Engineer's Choice",
    "campaignText": "देश का नं.1 सीमेंट",
    "parentCompany": "Aditya Birla Group"
  },
  "addressDetails": {
    "godown": {
      "company": "UltraTech Cement Ltd.",
      "careOf": "Pankaj Bambal",
      "address": "64/2, (S)64/2, 65/2, Nandpur, Pandhurna Industrial Area",
      "city": "Pandhurna",
      "state": "Madhya Pradesh",
      "pinCode": "480334"
    },
    "regionalOffice": {
      "company": "UltraTech Cement Ltd.",
      "division": "Cement Marketing Division",
      "floor": "3rd Floor",
      "address": "Niwarganj Extension Corporation Lease Plot No. 74 & 75 & part of House No. 804 & 805, Pandit Bhawani Prasad Ward, Gole Bazar",
      "city": "Jabalpur",
      "state": "Madhya Pradesh",
      "pinCode": "482002"
    },
    "zonalOffice": {
      "company": "UltraTech Cement Ltd.",
      "floor": "7th Floor",
      "building": "Cyber Heights",
      "locality": "Vibhuti Khand, Gomti Nagar",
      "city": "Lucknow",
      "state": "Uttar Pradesh",
      "pinCode": "226010"
    },
    "registeredOffice": {
      "company": "UltraTech Cement Ltd.",
      "address": "Ahura Centre, B Wing, 2nd Floor, MIDC, Mahakali Caves Road, Andheri (E)",
      "city": "Mumbai",
      "state": "Maharashtra",
      "pinCode": "400093"
    }
  },
  "keywords": [
    "UltraTech Cement",
    "Aditya Birla",
    "देश का नं.1 सीमेंट",
    "इंजीनियर की पसंद",
    "The Engineer's Choice",
    "Godown",
    "Regional Office",
    "Zonal Office",
    "Registered Office",
    "Pandhurna",
    "Jabalpur",
    "Lucknow",
    "Mumbai",
    "GSTN",
    "CIN"
  ]
}
];

export default ocrdata;
