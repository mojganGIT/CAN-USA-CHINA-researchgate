"""Read official BEA XLSX cells without executing formulas or workbook content."""
import io,json,pathlib,urllib.request,zipfile,xml.etree.ElementTree as ET
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
(root/'monitor/us-investment-discovery.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps([{'direction':r['direction'],'sheets':len(r.get('sheets',[])),'error':r.get('error')} for r in result]))
