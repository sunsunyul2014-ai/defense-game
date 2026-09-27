from flask import Flask, render_template, jsonify, request, session, redirect, url_for
from flask_socketio import SocketIO
import threading
import time
import os

from modules.database import SessionLocal, GameState, City, Nation, Tile, Building, User
from modules.world_gen import create_world, spawn_player
from modules.simulation import run_simulation_step

app = Flask(__name__)
app.secret_key = 'world_evolution_super_secret'
socketio = SocketIO(app, cors_allowed_origins="*", manage_session=True)

create_world(50)

def game_loop():
    while True:
        db = SessionLocal()
        
        # Check if there's any player nation. If not, wait until a player joins.
        player_exists = db.query(Nation).filter_by(is_player=True).first()
        if not player_exists:
            db.close()
            time.sleep(2)
            continue
            
        state_res = run_simulation_step(db)
        if not state_res:
            db.close()
            time.sleep(5)
            continue
            
        state, world_changed = state_res
            
        # Broadcast generic state
        update_data = {
            'year': state.year,
            'era': state.era,
            'map_size': state.map_size,
            'weather': state.weather
        }
        
        from modules.database import Unit
        nations = db.query(Nation).all()
        nation_dict = {n.id: n.color for n in nations}
        units = db.query(Unit).all()
        
        unit_data = []
        for u in units:
            unit_data.append({
                'id': u.id, 'x': u.x, 'z': u.z, 'color': nation_dict.get(u.nation_id, "#ffffff")
            })
        update_data['units'] = unit_data
        
        socketio.emit('state_update', update_data)
        if world_changed:
            socketio.emit('world_update')
        db.close()
        time.sleep(10) # 10 seconds per year

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        db = SessionLocal()
        user = db.query(User).filter_by(username=username).first()
        
        if not user:
            user = User(username=username, password=password)
            db.add(user)
            db.commit()
            spawn_player(db, user.id, username)
        elif user.password != password:
            db.close()
            return "Wrong password", 401
            
        session['user_id'] = user.id
        db.close()
        return redirect(url_for('index'))
    return render_template('login.html')

@app.route('/')
def index():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    db = SessionLocal()
    user = db.query(User).filter_by(id=session['user_id']).first()
    db.close()
    if not user:
        session.pop('user_id', None)
        return redirect(url_for('login'))
    return render_template('index.html')

@app.route('/api/player_data')
def player_data():
    if 'user_id' not in session: return jsonify({})
    db = SessionLocal()
    nation = db.query(Nation).filter_by(user_id=session['user_id']).first()
    if nation:
        city = db.query(City).filter_by(nation_id=nation.id).first()
        data = {
            'name': nation.name,
            'color': nation.color,
            'capital_x': city.x if city else 25,
            'capital_z': city.z if city else 25,
            'population': city.population if city else 0,
            'gold': nation.gold,
            'food_wheat': city.food_wheat if city else 0,
            'food_rice': city.food_rice if city else 0,
            'food_corn': city.food_corn if city else 0,
            'food_potato': city.food_potato if city else 0,
            'food_fruit': city.food_fruit if city else 0,
            'food_beef': city.food_beef if city else 0,
            'food_pork': city.food_pork if city else 0,
            'food_chicken': city.food_chicken if city else 0,
            'food_fish': city.food_fish if city else 0,
            'food_milk': city.food_milk if city else 0,
            'food_cheese': city.food_cheese if city else 0,
            'food_bread': city.food_bread if city else 0,
            'food_sausage': city.food_sausage if city else 0,
            'food_wine': city.food_wine if city else 0,
            'food_steak': city.food_steak if city else 0,
            'food_canned_fish': city.food_canned_fish if city else 0,
            'food_stew': city.food_stew if city else 0,
            'wood': city.wood if city else 0,
            'iron': city.iron if city else 0,
            'stone': city.stone if city else 0,
            'mineral': city.mineral if city else 0,
            'silver': city.silver if city else 0,
            'copper': city.copper if city else 0,
            'water': city.water if city else 0,
            'paper': city.paper if city else 0,
            'cut_stone': city.cut_stone if city else 0,
            'steel': city.steel if city else 0,
            'bronze': city.bronze if city else 0,
            'alloy': city.alloy if city else 0,
            'advanced_part': city.advanced_part if city else 0,
            'plastic': city.plastic if city else 0,
            'semiconductor': city.semiconductor if city else 0,
            'ai_chip': city.ai_chip if city else 0,
            'energy_core': city.energy_core if city else 0,
            'coal': city.coal if city else 0,
            'oil': city.oil if city else 0,
            'uranium': city.uranium if city else 0,
            'brick': city.brick if city else 0,
            'glass': city.glass if city else 0,
            'gunpowder': city.gunpowder if city else 0,
            'gasoline': city.gasoline if city else 0,
            'enriched_uranium': city.enriched_uranium if city else 0,
            'titanium': city.titanium if city else 0,
            'dark_matter': city.dark_matter if city else 0,
            'composite': city.composite if city else 0,
            'warp_drive': city.warp_drive if city else 0,
            'soldiers': city.soldiers if city else 0,
            'working_population': city.working_population if city else 0
        }
        
        # 유닛 종류별 개수 파악 및 병력수 동기화
        from modules.database import Unit
        units = db.query(Unit).filter_by(nation_id=nation.id).all()
        unit_counts = {}
        for u in units:
            unit_counts[u.u_type] = unit_counts.get(u.u_type, 0) + 1
        data['unit_counts'] = unit_counts
        
        # 병력 수치는 실제 유닛 수 기반으로 동기화 (오차 방지)
        actual_soldiers = len(units) * 10
        if city.soldiers != actual_soldiers:
            city.soldiers = actual_soldiers
            db.commit()
        
        # 남은 인구 계산 (병력 동기화 이후)
        data['working_pop'] = int(city.working_population)
        data['soldiers'] = int(city.soldiers)
        data['idle_pop'] = max(0, int(city.population - city.working_population - city.soldiers))
        
        db.close()
        return jsonify(data)
    db.close()
    return jsonify({})

@app.route('/api/nation_data')
def nation_data():
    color = request.args.get('color')
    if not color: return jsonify({})
    
    db = SessionLocal()
    nation = db.query(Nation).filter_by(color=color).first()
    if nation:
        city = db.query(City).filter_by(nation_id=nation.id).first()
        data = {
            'name': nation.name,
            'is_player': nation.is_player,
            'population': city.population if city else 0,
            'soldiers': city.soldiers if city else 0,
            'gold': nation.gold
        }
        db.close()
        return jsonify(data)
    db.close()
    return jsonify({})

@app.route('/api/world_data')
def world_data():
    db = SessionLocal()
    tiles = db.query(Tile).all()
    cities = db.query(City).all()
    nations = db.query(Nation).all()
    buildings = db.query(Building).all()
    
    nation_dict = {n.id: n.color for n in nations}
    
    tile_data = []
    for t in tiles:
        tile_data.append({
            'x': t.x, 'z': t.z, 
            'type': t.terrain_type, 
            'res_type': t.resource_type, 
            'res_amt': t.resource_amount,
            'owner_color': nation_dict.get(t.owner_id, None)
        })
        
    city_data = []
    for c in cities:
        city_data.append({
            'id': c.id, 'x': c.x, 'z': c.z, 'name': c.name, 'pop': c.population,
            'color': nation_dict.get(c.nation_id, "#ffffff")
        })
        
    city_pos_dict = {c.id: (c.x, c.z) for c in cities}
    bldg_data = []
    for b in buildings:
        if b.city_id in city_pos_dict:
            bldg_data.append({'type': b.b_type, 'x': b.x, 'z': b.z})
        
    db.close()
    return jsonify({"tiles": tile_data, "cities": city_data, "buildings": bldg_data})

@app.route('/api/build', methods=['POST'])
def build():
    if 'user_id' not in session: return jsonify({"status": "no session"})
    data = request.json
    b_type = data.get('type')
    bx = int(data.get('x', 0))  # Cast to int to match DB
    bz = int(data.get('z', 0))  # Cast to int to match DB
    
    db = SessionLocal()
    player = db.query(Nation).filter_by(user_id=session['user_id']).first()
    if player:
        p_city = db.query(City).filter_by(nation_id=player.id).first()
        if p_city:
            unit_list = ['원시전사', '투창병', '기사', '장궁병', '투석기', '머스킷병', '대포', '소총수', '탱크', '헬기', '비행기', '항공모함', '함포', '강화외골격병', '플라즈마전차', '전투로봇', '우주전함']
            is_unit = b_type in unit_list
            
            if is_unit:
                # 유닛은 도시 좌표에서 바로 생산되도록 좌표 고정
                bx, bz = p_city.x, p_city.z
            else:
                # Check if tile belongs to player (only for buildings)
                t = db.query(Tile).filter_by(x=bx, z=bz).first()
                if not t or t.owner_id != player.id:
                    db.close()
                    return jsonify({"status": "fail: 자신의 영토에만 건설할 수 있습니다."})
                
                # Check if there is already a building there
                existing_b = db.query(Building).filter_by(x=bx, z=bz).first()
                if existing_b:
                    db.close()
                    return jsonify({"status": "fail: 이미 해당 위치에 다른 건축물이 있습니다."})
            # Building Costs
            costs = {
                '주택(1티어)': {'wood': 50},
                '밀 농장': {'wood': 50},
                '어장': {'wood': 50},
                '돼지 농장': {'wood': 50},
                '벌목장(1티어)': {'wood': 100},
                '광산(1티어)': {'wood': 50, 'stone': 50},
                '망루(1티어)': {'wood': 100},
                '도예공방(1티어)': {'wood': 50, 'brick': 20},
                '제사단(1티어)': {'stone': 100},
                '성벽(1티어)': {'wood': 200},
                
                '주택(2티어)': {'wood': 100, 'stone': 50},
                '쌀 농장': {'wood': 100, 'iron': 50},
                '과수원': {'wood': 100, 'iron': 50},
                '소 목장': {'wood': 100, 'stone': 50},
                '양계장': {'wood': 100},
                '벌목장(2티어)': {'wood': 150, 'iron': 50},
                '광산(2티어)': {'wood': 100, 'stone': 100, 'iron': 50},
                '성(2티어)': {'wood': 300, 'stone': 500},
                '유리공방(2티어)': {'stone': 200, 'glass': 50},
                '대장간(2티어)': {'wood': 100, 'iron': 100},
                '연금술사의탑(2티어)': {'stone': 200, 'gold': 50},
                '시장(2티어)': {'wood': 200, 'gold': 100},
                '연구소(2티어)': {'stone': 300, 'gold': 200, 'iron': 100},
                
                '주택(3티어)': {'cut_stone': 100, 'silver': 50},
                '옥수수 농장': {'iron': 100, 'water': 100},
                '벌목장(3티어)': {'iron': 100, 'copper': 50},
                '광산(3티어)': {'iron': 200, 'mineral': 50},
                '공장(3티어)': {'iron': 300, 'copper': 100, 'gold': 100},
                '요새(3티어)': {'cut_stone': 300, 'iron': 200},
                '화약공장(3티어)': {'iron': 200, 'gunpowder': 100},
                '증기기관차역(3티어)': {'iron': 400, 'coal': 200},
                '은행(3티어)': {'cut_stone': 200, 'gold': 300},
                '병원(3티어)': {'cut_stone': 200, 'water': 200, 'silver': 100},
                
                '주택(4티어)': {'cut_stone': 200, 'gold': 100, 'mineral': 50},
                '감자 농장': {'iron': 200, 'copper': 100, 'water': 200},
                '광산(4티어)': {'cut_stone': 200, 'silver': 100, 'mineral': 100},
                '공장(4티어)': {'silver': 100, 'mineral': 200, 'gold': 200},
                '군사기지(4티어)': {'iron': 500, 'copper': 300, 'silver': 200},
                '정유소(4티어)': {'iron': 300, 'oil': 200},
                '발전소(4티어)': {'steel': 200, 'coal': 300},
                '방송국(4티어)': {'steel': 100, 'copper': 200},
                '함포(4티어)': {'steel': 400, 'gunpowder': 200},
                
                '주택(5티어)': {'plastic': 100, 'semiconductor': 50},
                '우주공항(5티어)': {'alloy': 500, 'advanced_part': 300, 'energy_core': 50},
                '반물질반응로(5티어)': {'energy_core': 200, 'ai_chip': 100, 'silver': 500},
                '보호막발생기(5티어)': {'alloy': 300, 'energy_core': 100, 'ai_chip': 50},
                
                '원시전사': {'food': 50},
                '투창병': {'food': 50, 'wood': 20},
                
                '기사': {'food': 100, 'iron': 50, 'gold': 50},
                '장궁병': {'food': 80, 'wood': 100, 'gold': 30},
                '투석기': {'wood': 200, 'stone': 100, 'gold': 50},
                
                '머스킷병': {'food': 100, 'iron': 100, 'copper': 50},
                '대포': {'iron': 300, 'mineral': 100, 'gold': 100},
                
                '소총수': {'food': 200, 'copper': 100, 'mineral': 50},
                '탱크': {'iron': 500, 'silver': 100, 'gold': 300},
                '헬기': {'iron': 300, 'mineral': 300, 'gold': 500},
                '비행기': {'steel': 200, 'gasoline': 100, 'advanced_part': 50},
                '항공모함': {'steel': 800, 'oil': 500, 'advanced_part': 200},
                
                '강화외골격병': {'plastic': 50, 'semiconductor': 50, 'food': 300},
                '플라즈마전차': {'alloy': 300, 'energy_core': 50, 'advanced_part': 100},
                '전투로봇': {'ai_chip': 50, 'alloy': 200, 'energy_core': 100},
                '우주전함': {'composite': 500, 'warp_drive': 50, 'ai_chip': 100, 'energy_core': 200}
            }
            
            # Terrain checks
            if '농' in b_type and t.terrain_type != '평원':
                db.close()
                return jsonify({"status": "fail: 평원에만 건설할 수 있습니다."})
            if '벌목장' in b_type and t.terrain_type != '숲':
                db.close()
                return jsonify({"status": "fail: 숲에만 건설할 수 있습니다."})
            if '광산' in b_type and t.terrain_type != '산':
                db.close()
                return jsonify({"status": "fail: 산에만 건설할 수 있습니다."})
                
            if '연구소' in b_type and not player.tech_iron_smelting:
                db.close()
                return jsonify({"status": "fail: 철기 제련 기술이 필요합니다."})
            if '화약공장' in b_type and not player.tech_gunpowder:
                db.close()
                return jsonify({"status": "fail: 화약 발명 기술이 필요합니다."})
            if '비행기' in b_type and not player.tech_flight:
                db.close()
                return jsonify({"status": "fail: 항공 기술이 필요합니다."})
            if ('항공모함' in b_type or '함포' in b_type) and not player.tech_naval:
                db.close()
                return jsonify({"status": "fail: 해군 기술이 필요합니다."})
            if ('우주공항' in b_type or '우주전함' in b_type) and not player.tech_space:
                db.close()
                return jsonify({"status": "fail: 우주 기술이 필요합니다."})
                
            cost = costs.get(b_type, {'wood': 10, 'stone': 10})
            
            missing = []
            for k, v in cost.items():
                if k == 'gold':
                    if (player.gold or 0) < v: missing.append(f"금(필요:{v})")
                else:
                    if k == 'food':
                        val = getattr(p_city, 'food_wheat', 0) or 0
                    else:
                        val = getattr(p_city, k, 0) or 0
                    if val < v: missing.append(f"{k}(필요:{v})")
            
            if missing:
                db.close()
                return jsonify({"status": f"fail: 자원 부족 ({', '.join(missing)})"})
            
            # Deduct resources
            for k, v in cost.items():
                if k == 'gold':
                    player.gold = (player.gold or 0) - v
                else:
                    if k == 'food':
                        p_city.food_wheat = (p_city.food_wheat or 0) - v
                    else:
                        setattr(p_city, k, (getattr(p_city, k, 0) or 0) - v)
            
            idle_pop = p_city.population - (p_city.working_population or 0) - (p_city.soldiers or 0)
            
            # Determine tier and labor
            tier = 1
            if '5티어' in b_type or b_type in ['강화외골격병', '플라즈마전차', '전투로봇', '우주전함']: tier = 5
            elif '4티어' in b_type or b_type in ['소총수', '탱크', '헬기', '비행기', '항공모함', '함포']: tier = 4
            elif '3티어' in b_type or b_type in ['머스킷병', '대포']: tier = 3
            elif '2티어' in b_type or b_type in ['기사', '장궁병', '투석기']: tier = 2
            
            labor_req = max(1, tier * 2)  # Reduced from tier*10 to be more lenient
            time_req = tier * 2
            
            if idle_pop < labor_req:
                db.close()
                return jsonify({"status": f"fail: 노동력이 부족합니다 (필요: {labor_req}, 잉여: {idle_pop})"})
                
            p_city.working_population = (p_city.working_population or 0) + labor_req
            
            from modules.database import Task
            new_task = Task(nation_id=player.id, city_id=p_city.id, task_type='build', target_name=b_type, target_x=bx, target_z=bz, labor_assigned=labor_req, time_remaining=time_req)
            db.add(new_task)
            
            db.commit()
            db.close()
            return jsonify({"status": "success", "msg": f"작업 시작: {b_type} (남은 턴: {time_req})"})
    db.close()
    return jsonify({"status": "fail"})

@app.route('/api/conquer', methods=['POST'])
def conquer():
    if 'user_id' not in session: return jsonify({"status": "no session"})
    data = request.json
    cx, cz = data.get('x'), data.get('z')
    
    db = SessionLocal()
    player = db.query(Nation).filter_by(user_id=session['user_id']).first()
    
    if not player:
        db.close()
        return jsonify({"status": "fail"})
        
    target_tile = db.query(Tile).filter_by(x=cx, z=cz).first()
    if not target_tile:
        db.close()
        return jsonify({"status": "fail"})
        
    # Check adjacency
    adjacent = db.query(Tile).filter(
        Tile.owner_id == player.id,
        Tile.x.between(cx-1, cx+1),
        Tile.z.between(cz-1, cz+1)
    ).first()
    
    if not adjacent:
        db.close()
        return jsonify({"status": "fail: not adjacent"})
        
    if target_tile.owner_id is None:
        # Empty tile
        p_city = db.query(City).filter_by(nation_id=player.id).first()
        idle_pop = p_city.population - (p_city.working_population or 0) - (p_city.soldiers or 0)
        labor_req = 10
        if idle_pop < labor_req:
            db.close()
            return jsonify({"status": f"fail: 빈 땅 개척에 노동력이 부족합니다 (필요: 10, 잉여: {idle_pop})"})
            
        p_city.working_population = (p_city.working_population or 0) + labor_req
        from modules.database import Task
        new_task = Task(nation_id=player.id, city_id=p_city.id, task_type='expand', target_x=cx, target_z=cz, labor_assigned=labor_req, time_remaining=1)
        db.add(new_task)
        db.commit()
        db.close()
        return jsonify({"status": "success", "msg": "영토 개척 시작 (남은 턴: 1)"})
    elif target_tile.owner_id != player.id:
        # Enemy tile -> Combat Task
        p_city = db.query(City).filter_by(nation_id=player.id).first()
        if p_city.soldiers < 10:
            db.close()
            return jsonify({"status": "fail: 병력이 부족하여 전쟁을 선포할 수 없습니다 (최소 10명 필요)"})
            
        p_city.soldiers -= 10 # Send soldiers to front (they act as assigned labor for war)
        from modules.database import Task
        new_task = Task(nation_id=player.id, city_id=p_city.id, task_type='conquer', target_x=cx, target_z=cz, labor_assigned=10, time_remaining=3)
        db.add(new_task)
        db.commit()
        db.close()
        return jsonify({"status": "success", "msg": "전쟁 선포! 전투 시작 (남은 턴: 3)"})
            
    db.close()
    return jsonify({"status": "fail: already owned"})

@socketio.on('connect')
def handle_connect():
    print("Client connected")

# ==========================================
# Diplomacy System
# ==========================================

@app.route('/api/diplomacy/status')
def diplomacy_status():
    """Get all nations and diplomacy state (war/peace) relative to the player."""
    if 'user_id' not in session: return jsonify({})
    db = SessionLocal()
    player = db.query(Nation).filter_by(user_id=session['user_id']).first()
    if not player:
        db.close()
        return jsonify({})
    
    nations = db.query(Nation).filter(Nation.id != player.id).all()
    result = []
    for n in nations:
        result.append({
            'id': n.id,
            'name': n.name,
            'color': n.color,
            'is_player': n.is_player,
            'at_war': n.id in (player.at_war_with or []),
            'gold': n.gold
        })
    db.close()
    return jsonify({'relations': result})

@app.route('/api/diplomacy/declare_war', methods=['POST'])
def declare_war():
    if 'user_id' not in session: return jsonify({'status': 'fail: not logged in'})
    target_id = request.json.get('nation_id')
    db = SessionLocal()
    player = db.query(Nation).filter_by(user_id=session['user_id']).first()
    target = db.query(Nation).filter_by(id=target_id).first()
    if not player or not target:
        db.close()
        return jsonify({'status': 'fail: nation not found'})
    
    war_list = list(player.at_war_with or [])
    if target_id not in war_list:
        war_list.append(target_id)
    player.at_war_with = war_list
    
    # Target also marks player as enemy
    t_war_list = list(target.at_war_with or [])
    if player.id not in t_war_list:
        t_war_list.append(player.id)
    target.at_war_with = t_war_list
    
    db.commit()
    db.close()
    return jsonify({'status': 'success', 'msg': f'{target.name}에게 선전포고했습니다!'})

@app.route('/api/diplomacy/make_peace', methods=['POST'])
def make_peace():
    if 'user_id' not in session: return jsonify({'status': 'fail: not logged in'})
    target_id = request.json.get('nation_id')
    db = SessionLocal()
    player = db.query(Nation).filter_by(user_id=session['user_id']).first()
    target = db.query(Nation).filter_by(id=target_id).first()
    if not player or not target:
        db.close()
        return jsonify({'status': 'fail: nation not found'})
    
    # Remove from war lists
    player.at_war_with = [x for x in (player.at_war_with or []) if x != target_id]
    target.at_war_with = [x for x in (target.at_war_with or []) if x != player.id]
    
    db.commit()
    db.close()
    return jsonify({'status': 'success', 'msg': f'{target.name}과 평화 협정을 맺었습니다.'})

@app.route('/api/diplomacy/trade', methods=['POST'])
def diplomacy_trade():
    """Player offers gold to another nation in exchange for resources."""
    if 'user_id' not in session: return jsonify({'status': 'fail: not logged in'})
    data = request.json
    target_id = data.get('nation_id')
    gold_offer = int(data.get('gold_offer', 0))
    
    db = SessionLocal()
    player = db.query(Nation).filter_by(user_id=session['user_id']).first()
    target = db.query(Nation).filter_by(id=target_id).first()
    
    if not player or not target:
        db.close()
        return jsonify({'status': 'fail: nation not found'})
    
    if player.gold < gold_offer or gold_offer <= 0:
        db.close()
        return jsonify({'status': 'fail: 금이 부족합니다.'})
    
    # Simple trade: give gold, receive random resources worth equal value
    import random
    p_city = db.query(City).filter_by(nation_id=player.id).first()
    t_city = db.query(City).filter_by(nation_id=target.id).first()
    
    if not p_city or not t_city:
        db.close()
        return jsonify({'status': 'fail: city not found'})
    
    player.gold -= gold_offer
    target.gold += gold_offer // 2  # Target keeps half
    
    # Give resources proportional to gold offered
    wood_gain = (gold_offer // 10)
    iron_gain = (gold_offer // 20)
    food_gain = (gold_offer // 15)
    
    p_city.wood += wood_gain
    p_city.iron += iron_gain
    p_city.food_wheat += food_gain
    
    db.commit()
    db.close()
    return jsonify({'status': 'success', 'msg': f'교역 완료! 나무 +{wood_gain}, 철 +{iron_gain}, 밀 +{food_gain}'})

@app.route('/api/research', methods=['POST'])
def research_tech():
    if 'user_id' not in session:
        return jsonify({"status": "fail: not logged in"})
        
    tech_name = request.json.get('tech_name')
    db = SessionLocal()
    player = db.query(Nation).filter_by(user_id=session['user_id']).first()
    city = db.query(City).filter_by(nation_id=player.id).first()
    
    if not player or not city:
        db.close()
        return jsonify({"status": "fail: no nation found"})
        
    tech_costs = {
        'tech_irrigation': {'gold': 100, 'wood': 100},
        'tech_iron_smelting': {'gold': 200, 'stone': 200},
        'tech_gunpowder': {'gold': 500, 'coal': 200},
        'tech_assembly_line': {'gold': 1000, 'steel': 200},
        'tech_flight': {'gold': 2000, 'alloy': 100, 'gasoline': 50},
        'tech_naval': {'gold': 2000, 'steel': 300, 'oil': 100},
        'tech_ai': {'gold': 3000, 'ai_chip': 100},
        'tech_space': {'gold': 5000, 'energy_core': 50, 'ai_chip': 100},
        'tech_dark_matter': {'gold': 10000, 'dark_matter': 100, 'energy_core': 200}
    }
    
    cost = tech_costs.get(tech_name)
    if not cost:
        db.close()
        return jsonify({"status": "fail: unknown tech"})
        
    if getattr(player, tech_name, False):
        db.close()
        return jsonify({"status": "fail: already researched"})
        
    req_g = cost.get('gold', 0)
    req_w = cost.get('wood', 0)
    req_s = cost.get('stone', 0)
    req_c = cost.get('coal', 0)
    req_st = cost.get('steel', 0)
    req_ai = cost.get('ai_chip', 0)
    req_al = cost.get('alloy', 0)
    req_gas = cost.get('gasoline', 0)
    req_oil = cost.get('oil', 0)
    req_ec = cost.get('energy_core', 0)
    req_dm = cost.get('dark_matter', 0)
    
    if (player.gold >= req_g and city.wood >= req_w and city.stone >= req_s and city.coal >= req_c and 
        city.steel >= req_st and city.ai_chip >= req_ai and city.alloy >= req_al and city.gasoline >= req_gas and 
        city.oil >= req_oil and city.energy_core >= req_ec and city.dark_matter >= req_dm):
        
        idle_pop = city.population - (city.working_population or 0) - (city.soldiers or 0)
        labor_req = 20
        time_req = 5
        
        if idle_pop < labor_req:
            db.close()
            return jsonify({"status": f"fail: 연구를 진행할 학자(노동력)가 부족합니다. (필요: {labor_req}, 잉여: {idle_pop})"})
            
        city.working_population = (city.working_population or 0) + labor_req
        
        player.gold -= req_g
        city.wood -= req_w
        city.stone -= req_s
        city.coal -= req_c
        city.steel -= req_st
        city.ai_chip -= req_ai
        city.alloy -= req_al
        city.gasoline -= req_gas
        city.oil -= req_oil
        city.energy_core -= req_ec
        city.dark_matter -= req_dm
        
        from modules.database import Task
        new_task = Task(nation_id=player.id, city_id=city.id, task_type='research', target_name=tech_name, labor_assigned=labor_req, time_remaining=time_req)
        db.add(new_task)
        db.commit()
        db.close()
        return jsonify({"status": "success", "msg": f"연구 시작: {tech_name} (남은 턴: {time_req})"})
    else:
        db.close()
        return jsonify({"status": "fail: not enough resources"})

if __name__ == '__main__':
    sim_thread = threading.Thread(target=game_loop, daemon=True)
    sim_thread.start()
    socketio.run(app, debug=True, port=5000, host='0.0.0.0', use_reloader=False, allow_unsafe_werkzeug=True)

