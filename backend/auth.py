# auth.py
from datetime import datetime, timedelta
from typing import Optional

from passlib.context import CryptContext
from jose import JWTError, jwt

# ===========================
# تنظیمات JWT
# ===========================
SECRET_KEY = "super-secret-development-key-change-me"  # بعداً می‌تونی بذاری از env بیاد
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # توکن 24 ساعته

# ===========================
# تنظیمات پسورد (hashing)
# به‌جای bcrypt از sha256_crypt استفاده می‌کنیم
# ===========================
pwd_context = CryptContext(
    schemes=["sha256_crypt"],
    deprecated="auto",
)

def hash_password(password: str) -> str:
    """
    هش کردن پسورد با استفاده از sha256_crypt.
    """
    return pwd_context.hash(password)

def verify_password(password: str, hashed_password: str) -> bool:
    """
    چک کردن پسورد ورودی با هش ذخیره‌شده.
    """
    return pwd_context.verify(password, hashed_password)

# ===========================
# توکن JWT
# ===========================
def create_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    ساخت توکن JWT با payload داده شده.
    به طور پیش‌فرض 24 ساعت اعتبار دارد.
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def decode_token(token: str) -> Optional[dict]:
    """
    دیکود کردن توکن JWT.
    در صورت نامعتبر بودن توکن، None برمی‌گرداند.
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None
