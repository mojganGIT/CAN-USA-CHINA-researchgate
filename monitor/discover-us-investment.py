"""Read official BEA XLSX cells without executing formulas or workbook content."""
import io,json,pathlib,urllib.request,zipfile,xml.etree.ElementTree as ET,re,hashlib,datetime
root=pathlib.Path(__file__).resolve().parent.parent
sources=[('outward','https://apps.bea.gov/international/xls/usdia-current/usdia-detailedcountry-2020-2025.xlsx'),('inward','https://apps.bea.gov/international/xls/fdius-current/fdius-detailed-country-2020-2025.xlsx')]
ns={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
result=[]
for direction,url in sources:
 try:
  with urllib.request.urlopen(url,timeout=45) as response:
   if not response.url.startswith('https://apps.bea.gov/'):raise ValueError('Unexpected BEA redirect')
   body=response.read(10000000)
  z=zipfile.ZipFile(io.BytesIO(body));strings=[]
  if 'xl/sharedStrings.xml' in z.namelist():strings=[''.join(si.itertext()) for si in ET.fromstring(z.read('xl/sharedStrings.xml')).findall('s:si',ns)]
  sheets=[]
  for name in z.namelist():
   if not name.startswith('xl/worksheets/sheet') or not name.endswith('.xml'):continue
   rows=[]
   for row in ET.fromstring(z.read(name)).findall('.//s:row',ns):
    cells={}
    for c in row.findall('s:c',ns):
     v=c.find('s:v',ns);value=v.text if v is not None else ''.join(c.itertext())
     if c.attrib.get('t')=='s' and value:value=strings[int(value)]
     cells[c.attrib.get('r')]=value
    if int(row.attrib['r'])<12 or any(v in ['China','Canada'] for v in cells.values()):rows.append(cells)
   sheets.append({'sheet':name,'rows':rows})
  result.append({'direction':direction,'url':url,'sheets':sheets})
 except Exception as exc:result.append({'direction':direction,'url':url,'error':str(exc)})
now=datetime.datetime.now(datetime.timezone.utc).isoformat()
output=root/'app/us-investment-statistics.json'
try:previous=json.loads(output.read_text())
except (OSError,ValueError):previous={'sources':[]}
parsed=[]
for book in result:
 old=next((s for s in previous['sources'] if s['direction']==book['direction']),{})
 try:
  if book.get('error'):raise ValueError(book['error'])
  records=[]
  for sheet in book['sheets']:
   title=next(iter(sheet['rows'][0].values()))
   measure='financial_flow' if 'Transactions' in title else 'affiliate_income' if 'Income' in title else 'stock' if 'Position' in title else None
   if not measure:continue
   header=next(row for row in sheet['rows'] if '2025' in row.values())
   cols={re.sub(r'\d','',cell):int(year) for cell,year in header.items() if re.fullmatch(r'202[0-5]',year)}
   if len(cols)!=6:raise ValueError('BEA year headers changed')
   for row in sheet['rows']:
    partner=next((v for v in row.values() if v in ['Canada','China']),None)
    if not partner:continue
    for col,year in cols.items():
     cell=next(k for k in row if re.sub(r'\d','',k)==col);raw=row[cell]
     value=float(raw) if re.fullmatch(r'-?\d+(?:\.\d+)?',raw) else None
     records.append({'partner':partner,'year':year,'direction':book['direction'],'measure':measure,'value':value,'rawValue':raw,'unit':'USD million','sourceCell':sheet['sheet']+'!'+cell})
  if len(records)!=36 or len({(r['partner'],r['year'],r['measure']) for r in records})!=36:raise ValueError('Incomplete or duplicate BEA country/year/measure mapping')
  digest=hashlib.sha256(json.dumps(records,sort_keys=True).encode()).hexdigest()
  parsed.append({'direction':book['direction'],'sourceId':'US45' if book['direction']=='outward' else 'US46','url':book['url'],'status':'success','retrievedAt':now,'lastAttempt':now,'digest':digest,'records':records})
 except Exception as exc:parsed.append({**old,'direction':book['direction'],'url':book['url'],'status':'unavailable','lastAttempt':now,'error':str(exc),'records':old.get('records',[])})
status='success' if all(s['status']=='success' for s in parsed) else 'partial' if any(s['status']=='success' for s in parsed) else 'unavailable'
output.write_text(json.dumps({'schemaVersion':1,'status':status,'lastAttempt':now,'basis':'BEA detailed-country workbooks, USD million; historical-cost positions, financial transactions and investment income, 2020–2025. Immediate counterpart / foreign-parent country; not ultimate ownership or completed capex. Disclosure flags remain in rawValue.','sources':parsed,'series':[r for s in parsed for r in s['records']]},indent=2)+'\n')
(root/'monitor/us-investment-discovery.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({'status':status,'observations':sum(len(s['records']) for s in parsed),'sources':[{'direction':s['direction'],'status':s['status'],'error':s.get('error')} for s in parsed]}))
