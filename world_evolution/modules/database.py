from sqlalchemy import create_engine, Column, Integer, String, Float, ForeignKey, Boolean, JSON
from sqlalchemy.orm import declarative_base, relationship, sessionmaker
import os

Base = declarative_base()

class GameState(Base):
    __tablename__ = 'game_state'
    id = Column(Integer, primary_key=True)
    year = Column(Integer, default=1)
    era = Column(String, default="고대") # 고대, 중세, 근대, 현대
    map_size = Column(Integer, default=50)
    weather = Column(String, default="맑음") # 맑음, 비, 폭풍, 가뭄, 방사능 낙진

class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True)
    username = Column(String, unique=True)
    password = Column(String)
    
    nation = relationship("Nation", back_populates="user", uselist=False)

class Nation(Base):
    __tablename__ = 'nations'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    name = Column(String)
    color = Column(String) # Hex color for UI and borders
    gold = Column(Float, default=500.0)
    is_player = Column(Boolean, default=False)
    
    # Technologies (Booleans)
    tech_irrigation = Column(Boolean, default=False)
    tech_iron_smelting = Column(Boolean, default=False)
    tech_gunpowder = Column(Boolean, default=False)
    tech_assembly_line = Column(Boolean, default=False)
    tech_ai = Column(Boolean, default=False)
    tech_flight = Column(Boolean, default=False)
    tech_naval = Column(Boolean, default=False)
    tech_space = Column(Boolean, default=False)
    tech_dark_matter = Column(Boolean, default=False)
    
    # Diplomacy: list of nation IDs currently at war with
    at_war_with = Column(JSON, default=list)
    
    user = relationship("User", back_populates="nation")
    cities = relationship("City", back_populates="nation")
    tiles = relationship("Tile", back_populates="owner")
    units = relationship("Unit", back_populates="nation")

class City(Base):
    __tablename__ = 'cities'
    id = Column(Integer, primary_key=True)
    name = Column(String)
    nation_id = Column(Integer, ForeignKey('nations.id'))
    x = Column(Integer)
    z = Column(Integer)
    population = Column(Integer, default=100)
    working_population = Column(Integer, default=0)
    
    # Raw Foods (Crops & Meat)
    food_wheat = Column(Float, default=30.0)
    food_rice = Column(Float, default=10.0)
    food_corn = Column(Float, default=10.0)
    food_potato = Column(Float, default=10.0)
    food_fruit = Column(Float, default=15.0)
    food_beef = Column(Float, default=0.0)
    food_pork = Column(Float, default=0.0)
    food_chicken = Column(Float, default=0.0)
    food_fish = Column(Float, default=0.0)
    food_milk = Column(Float, default=0.0)
    
    # Processed Foods
    food_cheese = Column(Float, default=0.0)
    food_bread = Column(Float, default=0.0)
    food_sausage = Column(Float, default=0.0)
    food_wine = Column(Float, default=0.0)
    food_steak = Column(Float, default=0.0)
    food_canned_fish = Column(Float, default=0.0)
    food_stew = Column(Float, default=0.0)
    
    # Local resources
    wood = Column(Float, default=30.0)
    stone = Column(Float, default=20.0)
    iron = Column(Float, default=0.0)
    mineral = Column(Float, default=0.0)
    silver = Column(Float, default=0.0)
    copper = Column(Float, default=0.0)
    water = Column(Float, default=80.0)
    
    # Processed items
    paper = Column(Float, default=0.0)
    cut_stone = Column(Float, default=0.0)
    
    # Advanced Processed Resources
    steel = Column(Float, default=0.0)
    bronze = Column(Float, default=0.0)
    alloy = Column(Float, default=0.0)
    advanced_part = Column(Float, default=0.0)
    
    # Future Processed Resources
    plastic = Column(Float, default=0.0)
    semiconductor = Column(Float, default=0.0)
    ai_chip = Column(Float, default=0.0)
    energy_core = Column(Float, default=0.0)
    
    # NEW Additional Resources
    coal = Column(Float, default=0.0)
    oil = Column(Float, default=0.0)
    uranium = Column(Float, default=0.0)
    titanium = Column(Float, default=0.0)
    dark_matter = Column(Float, default=0.0)
    
    brick = Column(Float, default=0.0)
    glass = Column(Float, default=0.0)
    gunpowder = Column(Float, default=0.0)
    gasoline = Column(Float, default=0.0)
    enriched_uranium = Column(Float, default=0.0)
    composite = Column(Float, default=0.0)
    warp_drive = Column(Float, default=0.0)
    
    # Military
    soldiers = Column(Integer, default=0)
    
    nation = relationship("Nation", back_populates="cities")
    buildings = relationship("Building", back_populates="city")

class Building(Base):
    __tablename__ = 'buildings'
    id = Column(Integer, primary_key=True)
    city_id = Column(Integer, ForeignKey('cities.id'))
    b_type = Column(String) # 주택, 농장, 벌목장, 광산, 성...
    x = Column(Integer)
    z = Column(Integer)
    
    city = relationship("City", back_populates="buildings")

class Unit(Base):
    __tablename__ = 'units'
    id = Column(Integer, primary_key=True)
    nation_id = Column(Integer, ForeignKey('nations.id'))
    u_type = Column(String) # 보병, 기병, 탱크, 헬기 등
    x = Column(Float)
    z = Column(Float)
    target_x = Column(Float, nullable=True)
    target_z = Column(Float, nullable=True)
    health = Column(Float, default=100.0)
    
    nation = relationship("Nation", back_populates="units")

class Task(Base):
    __tablename__ = 'tasks'
    id = Column(Integer, primary_key=True)
    nation_id = Column(Integer, ForeignKey('nations.id'))
    city_id = Column(Integer, ForeignKey('cities.id'))
    task_type = Column(String) # 'build', 'research', 'conquer'
    target_name = Column(String) # building name, tech name
    target_x = Column(Integer, nullable=True)
    target_z = Column(Integer, nullable=True)
    labor_assigned = Column(Integer, default=0)
    time_remaining = Column(Integer, default=1)
    
class Tile(Base):
    __tablename__ = 'tiles'
    id = Column(Integer, primary_key=True)
    x = Column(Integer)
    z = Column(Integer)
    terrain_type = Column(String) # 평원, 숲, 산, 사막, 바다 등
    
    # Finite Resources on the tile
    resource_type = Column(String, nullable=True) # 나무, 돌, 광석
    resource_amount = Column(Float, default=0.0)
    
    owner_id = Column(Integer, ForeignKey('nations.id'), nullable=True)
    owner = relationship("Nation", back_populates="tiles")

# Setup Database
db_path = os.path.join(os.path.dirname(__file__), '..', 'world_evolution.db')
engine = create_engine(f'sqlite:///{db_path}', connect_args={'check_same_thread': False})

def init_db():
    Base.metadata.create_all(engine)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
