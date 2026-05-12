import csv
import json
import os

def parse_staff():
    base_path = '/home/Karmas/Documentos/Antigravity/InvetaioMateriales/funcionarios/'
    files = [
        ('lista_docentes_rbd_711_anio_2026.csv', 'DOC_RUN', 'DOC_DV', 'DOC_NOMBRE', 'DOC_PATERNO', 'DOC_MATERNO', 'FUNCION_PRINCIPAL'),
        ('lista_asistentes_rbd_711_anio_2026.csv', 'ASISTENTE_RUN', 'ASISTENTE_DV', 'ASISTENTE_NOMBRE', 'ASISTENTE_PATERNO', 'ASISTENTE_MATERNO', 'FUNCION_UNO')
    ]
    
    all_staff = []
    
    for filename, run_k, dv_k, name_k, pat_k, mat_k, func_k in files:
        path = os.path.join(base_path, filename)
        if not os.path.exists(path):
            continue
            
        with open(path, mode='r', encoding='latin-1') as f:
            reader = csv.DictReader(f, delimiter=';')
            for row in reader:
                if not row.get(run_k): continue
                
                nombre = f"{row[name_k]} {row[pat_k]} {row[mat_k]}".strip().title()
                rut = f"{row[run_k]}-{row[dv_k]}"
                depto = row.get(func_k, 'General')
                
                all_staff.append({
                    "nombre": nombre,
                    "rut": rut,
                    "departamento": depto
                })
                
    with open('/home/Karmas/Documentos/Antigravity/InvetaioMateriales/staff_data.json', 'w', encoding='utf-8') as out:
        json.dump(all_staff, out, indent=2, ensure_ascii=False)

if __name__ == "__main__":
    parse_staff()
