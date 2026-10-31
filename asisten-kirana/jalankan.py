"""Klik kanan file ini di PyCharm -> Run 'jalankan' (atau tombol ▶ hijau).

Streamlit biasanya dijalankan lewat terminal dengan `streamlit run app.py`.
File ini melakukan hal yang sama, jadi kamu cukup menekan Run di PyCharm.
Browser akan terbuka otomatis di http://localhost:8501
"""

import sys
from pathlib import Path

from streamlit.web import cli

if __name__ == "__main__":
    app = Path(__file__).parent / "app.py"
    sys.argv = ["streamlit", "run", str(app)]
    sys.exit(cli.main())
