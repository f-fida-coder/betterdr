"use strict";
var routteNumber = 1;

(function(dice) {

    var random_storage = [];
    this.use_true_random = false;
    this.frame_rate = 1 / 60;

    function prepare_rnd(callback) {
        if (!random_storage.length && $t.dice.use_true_random) {
            try {
                $t.rpc({ method: "random", n: 512 }, 
                function(random_responce) {
                    if (!random_responce.error)
                        random_storage = random_responce.result.random.data;
                    else $t.dice.use_true_random = false;
                    callback();
                });
                return;
            }
            catch (e) { $t.dice.use_true_random = false; }
        }
        callback();
    }

    function rnd() {
        return random_storage.length ? random_storage.pop() : Math.random();
    }

    function create_shape(vertices, faces, radius) {
        var cv = new Array(vertices.length), cf = new Array(faces.length);
        for (var i = 0; i < vertices.length; ++i) {
            var v = vertices[i];
            cv[i] = new CANNON.Vec3(v.x * radius, v.y * radius, v.z * radius);
        }
        for (var i = 0; i < faces.length; ++i) {
            cf[i] = faces[i].slice(0, faces[i].length - 1);
        }
        return new CANNON.ConvexPolyhedron(cv, cf);
    }

    function make_geom(vertices, faces, radius, tab, af) {
        var geom = new THREE.Geometry();
        for (var i = 0; i < vertices.length; ++i) {
            var vertex = vertices[i].multiplyScalar(radius);
            vertex.index = geom.vertices.push(vertex) - 1;
        }
        for (var i = 0; i < faces.length; ++i) {
            var ii = faces[i], fl = ii.length - 1;
            var aa = Math.PI * 2 / fl;
            for (var j = 0; j < fl - 2; ++j) {
                geom.faces.push(new THREE.Face3(ii[0], ii[j + 1], ii[j + 2], [geom.vertices[ii[0]],
                            geom.vertices[ii[j + 1]], geom.vertices[ii[j + 2]]], 0, ii[fl] + 1));
                geom.faceVertexUvs[0].push([
                        new THREE.Vector2((Math.cos(af) + 1 + tab) / 2 / (1 + tab),
                            (Math.sin(af) + 1 + tab) / 2 / (1 + tab)),
                        new THREE.Vector2((Math.cos(aa * (j + 1) + af) + 1 + tab) / 2 / (1 + tab),
                            (Math.sin(aa * (j + 1) + af) + 1 + tab) / 2 / (1 + tab)),
                        new THREE.Vector2((Math.cos(aa * (j + 2) + af) + 1 + tab) / 2 / (1 + tab),
                            (Math.sin(aa * (j + 2) + af) + 1 + tab) / 2 / (1 + tab))]);
            }
        }
        geom.computeFaceNormals();
        geom.boundingSphere = new THREE.Sphere(new THREE.Vector3(), radius);
        return geom;
    }

    function chamfer_geom(vectors, faces, chamfer) {
        var chamfer_vectors = [], chamfer_faces = [], corner_faces = new Array(vectors.length);
        for (var i = 0; i < vectors.length; ++i) corner_faces[i] = [];
        for (var i = 0; i < faces.length; ++i) {
            var ii = faces[i], fl = ii.length - 1;
            var center_point = new THREE.Vector3();
            var face = new Array(fl);
            for (var j = 0; j < fl; ++j) {
                var vv = vectors[ii[j]].clone();
                center_point.add(vv);
                corner_faces[ii[j]].push(face[j] = chamfer_vectors.push(vv) - 1);
            }
            center_point.divideScalar(fl);
            for (var j = 0; j < fl; ++j) {
                var vv = chamfer_vectors[face[j]];
                vv.subVectors(vv, center_point).multiplyScalar(chamfer).addVectors(vv, center_point);
            }
            face.push(ii[fl]);
            chamfer_faces.push(face);
        }
        for (var i = 0; i < faces.length - 1; ++i) {
            for (var j = i + 1; j < faces.length; ++j) {
                var pairs = [], lastm = -1;
                for (var m = 0; m < faces[i].length - 1; ++m) {
                    var n = faces[j].indexOf(faces[i][m]);
                    if (n >= 0 && n < faces[j].length - 1) {
                        if (lastm >= 0 && m != lastm + 1) pairs.unshift([i, m], [j, n]);
                        else pairs.push([i, m], [j, n]);
                        lastm = m;
                    }
                }
                if (pairs.length != 4) continue;
                chamfer_faces.push([chamfer_faces[pairs[0][0]][pairs[0][1]],
                        chamfer_faces[pairs[1][0]][pairs[1][1]],
                        chamfer_faces[pairs[3][0]][pairs[3][1]],
                        chamfer_faces[pairs[2][0]][pairs[2][1]], -1]);
            }
        }
        for (var i = 0; i < corner_faces.length; ++i) {
            var cf = corner_faces[i], face = [cf[0]], count = cf.length - 1;
            while (count) {
                for (var m = faces.length; m < chamfer_faces.length; ++m) {
                    var index = chamfer_faces[m].indexOf(face[face.length - 1]);
                    if (index >= 0 && index < 4) {
                        if (--index == -1) index = 3;
                        var next_vertex = chamfer_faces[m][index];
                        if (cf.indexOf(next_vertex) >= 0) {
                            face.push(next_vertex);
                            break;
                        }
                    }
                }
                --count;
            }
            face.push(-1);
            chamfer_faces.push(face);
        }
        return { vectors: chamfer_vectors, faces: chamfer_faces };
    }

    function create_geom(vertices, faces, radius, tab, af, chamfer) {
        var vectors = new Array(vertices.length);
        for (var i = 0; i < vertices.length; ++i) {
            vectors[i] = (new THREE.Vector3).fromArray(vertices[i]).normalize();
        }
        var cg = chamfer_geom(vectors, faces, chamfer);
        var geom = make_geom(cg.vectors, cg.faces, radius, tab, af);
        //var geom = make_geom(vectors, faces, radius, tab, af); // Without chamfer
        geom.cannon_shape = create_shape(vectors, faces, radius);
        return geom;
    }

    this.standart_d6_dice_face_labels = [' ', '0', '1', '2', '3', '4', '5', '6', '7', '8',
    '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20'];

            this.standart_d20_dice_face_labels = [' ', '0', '1', '2', '3', '4', '5', '6', '7', '8',
            '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20'];            
    this.standart_d100_dice_face_labels = [' ', '00', '10', '20', '30', '40', '50',
            '60', '70', '80', '90'];

    function calc_texture_size(approx) {
        return Math.pow(2, Math.floor(Math.log(approx) / Math.log(2)));
    }

    this.create_dice_materials = function(face_labels, size, margin) {

        function create_text_texture(text, color, back_color) {
            if (text == undefined) return null;
            var canvas = document.createElement("canvas");
            var context = canvas.getContext("2d");
            var ts = calc_texture_size(size + size * 2 * margin) * 2;
            canvas.width = canvas.height = ts;
            /*context.font = "100pt Times New Roman";
            context.fillStyle = back_color;
            context.fillRect(0, 0, canvas.width, canvas.height);
            context.textAlign = "center";
            context.textBaseline = "middle";
            context.fillStyle = color;
            context.fillText(text, canvas.width / 2, canvas.height / 2);*/

            context.fillStyle = back_color;
            context.fillRect(0, 0, canvas.width, canvas.height);
            var base_image = new Image();
            base_image.src = 'images/dice/'+text+'.jpg';
            context.drawImage(base_image,  0, 0, canvas.width, canvas.height);

            /*if (text == '6' || text == '9') {
                context.fillText('  .', canvas.width / 2, canvas.height / 2);
            }*/
            var texture = new THREE.Texture(canvas);
            texture.repeat.set(1.5, 1.5);
            texture.offset.set(0.75,0.75);
            texture.wrapS=128;
            texture.wrapT=128;

            texture.needsUpdate = true;
            return texture;
        }
        

        /*function create_text_texture(text, color, back_color) {
            //if(text  == '1' || text  == '2' || text  == '3' || text  == '4' || text  == '5' || text  == '6' )
            
                var textureLoader = new THREE.TextureLoader();
                var map = textureLoader.load('images/dice/'+text+'.jpg');
                map.repeat.set(1.5, 1.5);
                map.offset.set(0.75,0.75);
                map.wrapS=128;
                map.wrapT=128;
 
                var material = new THREE.MeshPhongMaterial({map: map ,color:0xffffff});
                return material;
            
            
            
        }*/


        var materials = [];
        for (var i = 0; i < face_labels.length; ++i)
            materials.push(new THREE.MeshPhongMaterial($t.copyto(this.material_options,
                        { map: create_text_texture(face_labels[i], this.label_color, this.dice_color) })));
            //materials.push(create_text_texture(face_labels[i], this.label_color, this.dice_color));
        return materials;
    }

    var d4_labels = [
        [[], [0, 0, 0], [2, 4, 3], [1, 3, 4], [2, 1, 4], [1, 2, 3]],
        [[], [0, 0, 0], [2, 3, 4], [3, 1, 4], [2, 4, 1], [3, 2, 1]],
        [[], [0, 0, 0], [4, 3, 2], [3, 4, 1], [4, 2, 1], [3, 1, 2]],
        [[], [0, 0, 0], [4, 2, 3], [1, 4, 3], [4, 1, 2], [1, 3, 2]]
    ];

    this.create_d4_materials = function(size, margin, labels) {
        function create_d4_text(text, color, back_color) {
            var canvas = document.createElement("canvas");
            var context = canvas.getContext("2d");
            var ts = calc_texture_size(size + margin) * 2;
            canvas.width = canvas.height = ts;
            context.font = (ts - margin) / 1.5 + "pt Arial";
            context.fillStyle = back_color;
            context.fillRect(0, 0, canvas.width, canvas.height);
            context.textAlign = "center";
            context.textBaseline = "middle";
            context.fillStyle = color;
            for (var i in text) {
                context.fillText(text[i], canvas.width / 2,
                        canvas.height / 2 - ts * 0.3);
                context.translate(canvas.width / 2, canvas.height / 2);
                context.rotate(Math.PI * 2 / 3);
                context.translate(-canvas.width / 2, -canvas.height / 2);
            }
            var texture = new THREE.Texture(canvas);
            texture.needsUpdate = true;
            return texture;
        }
        var materials = [];
        for (var i = 0; i < labels.length; ++i)
            materials.push(new THREE.MeshPhongMaterial($t.copyto(this.material_options,
                        { map: create_d4_text(labels[i], this.label_color, this.dice_color) })));
        return materials;
    }

    this.create_d4_geometry = function(radius) {
        var vertices = [[1, 1, 1], [-1, -1, 1], [-1, 1, -1], [1, -1, -1]];
        var faces = [[1, 0, 2, 1], [0, 1, 3, 2], [0, 3, 2, 3], [1, 2, 3, 4]];
        return create_geom(vertices, faces, radius, -0.1, Math.PI * 7 / 6, 0.96);
    }

    this.create_d6_geometry = function(radius) {
        var vertices = [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
                [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]];
        var faces = [[0, 3, 2, 1, 1], [1, 2, 6, 5, 2], [0, 1, 5, 4, 3],
                [3, 7, 6, 2, 4], [0, 4, 7, 3, 5], [4, 5, 6, 7, 6]];
        return create_geom(vertices, faces, radius, 0.1, Math.PI / 4, 0.96);
    }

    this.create_d8_geometry = function(radius) {
        var vertices = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
        var faces = [[0, 2, 4, 1], [0, 4, 3, 2], [0, 3, 5, 3], [0, 5, 2, 4], [1, 3, 4, 5],
                [1, 4, 2, 6], [1, 2, 5, 7], [1, 5, 3, 8]];
        return create_geom(vertices, faces, radius, 0, -Math.PI / 4 / 2, 0.965);
    }

    this.create_d10_geometry = function(radius) {
        var a = Math.PI * 2 / 10, k = Math.cos(a), h = 0.105, v = -1;
        var vertices = [];
        for (var i = 0, b = 0; i < 10; ++i, b += a)
            vertices.push([Math.cos(b), Math.sin(b), h * (i % 2 ? 1 : -1)]);
        vertices.push([0, 0, -1]); vertices.push([0, 0, 1]);
        var faces = [[5, 7, 11, 0], [4, 2, 10, 1], [1, 3, 11, 2], [0, 8, 10, 3], [7, 9, 11, 4],
                [8, 6, 10, 5], [9, 1, 11, 6], [2, 0, 10, 7], [3, 5, 11, 8], [6, 4, 10, 9],
                [1, 0, 2, v], [1, 2, 3, v], [3, 2, 4, v], [3, 4, 5, v], [5, 4, 6, v],
                [5, 6, 7, v], [7, 6, 8, v], [7, 8, 9, v], [9, 8, 0, v], [9, 0, 1, v]];
        return create_geom(vertices, faces, radius, 0, Math.PI * 6 / 5, 0.945);
    }

    this.create_d12_geometry = function(radius) {
        var p = (1 + Math.sqrt(5)) / 2, q = 1 / p;
        var vertices = [[0, q, p], [0, q, -p], [0, -q, p], [0, -q, -p], [p, 0, q],
                [p, 0, -q], [-p, 0, q], [-p, 0, -q], [q, p, 0], [q, -p, 0], [-q, p, 0],
                [-q, -p, 0], [1, 1, 1], [1, 1, -1], [1, -1, 1], [1, -1, -1], [-1, 1, 1],
                [-1, 1, -1], [-1, -1, 1], [-1, -1, -1]];
        var faces = [[2, 14, 4, 12, 0, 1], [15, 9, 11, 19, 3, 2], [16, 10, 17, 7, 6, 3], [6, 7, 19, 11, 18, 4],
                [6, 18, 2, 0, 16, 5], [18, 11, 9, 14, 2, 6], [1, 17, 10, 8, 13, 7], [1, 13, 5, 15, 3, 8],
                [13, 8, 12, 4, 5, 9], [5, 4, 14, 9, 15, 10], [0, 12, 8, 10, 16, 11], [3, 19, 7, 17, 1, 12]];
        return create_geom(vertices, faces, radius, 0.2, -Math.PI / 4 / 2, 0.968);
    }

    this.create_d20_geometry = function(radius) {
        var t = (1 + Math.sqrt(5)) / 2;
        var vertices = [[-1, t, 0], [1, t, 0 ], [-1, -t, 0], [1, -t, 0],
                [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
                [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]];
        var faces = [[0, 11, 5, 1], [0, 5, 1, 2], [0, 1, 7, 3], [0, 7, 10, 4], [0, 10, 11, 5],
                [1, 5, 9, 6], [5, 11, 4, 7], [11, 10, 2, 8], [10, 7, 6, 9], [7, 1, 8, 10],
                [3, 9, 4, 11], [3, 4, 2, 12], [3, 2, 6, 13], [3, 6, 8, 14], [3, 8, 9, 15],
                [4, 9, 5, 16], [2, 4, 11, 17], [6, 2, 10, 18], [8, 6, 7, 19], [9, 8, 1, 20]];
        return create_geom(vertices, faces, radius, -0.2, -Math.PI / 4 / 2, 0.955);
    }

    this.material_options = {
        specular: 0x172022,
        color: 0xf0f0f0,
        shininess: 40,
        shading: THREE.FlatShading,
    };
    this.label_color = '#aaaaaa';
    this.dice_color = '#202020';
    this.ambient_light_color = 0xf0f5fb;
    this.spot_light_color = 0xefdfd5;
    this.selector_back_colors = { color: 0x404040, shininess: 0, emissive: 0x858787 };
    this.desk_color = 0xdfdfdf;
    this.use_shadows = true;

    this.known_types = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100'];
    this.dice_face_range = { 'd4': [1, 4], 'd6': [1, 6], 'd8': [1, 8], 'd10': [0, 9], 
        'd12': [1, 12], 'd20': [1, 20], 'd100': [0, 9] };
    this.dice_mass = { 'd4': 300, 'd6': 300, 'd8': 340, 'd10': 350, 'd12': 350, 'd20': 400, 'd100': 350 };
    this.dice_inertia = { 'd4': 5, 'd6': 15, 'd8': 10, 'd10': 9, 'd12': 8, 'd20': 6, 'd100': 9 };

    this.scale = 50;

    this.create_d4 = function() {
        if (!this.d4_geometry) this.d4_geometry = this.create_d4_geometry(this.scale * 1.2);
        if (!this.d4_material) this.d4_material = new THREE.MeshFaceMaterial(
                this.create_d4_materials(this.scale / 2, this.scale * 2, d4_labels[0]));
        return new THREE.Mesh(this.d4_geometry, this.d4_material);
    }

    this.create_d6 = function() {
        if (!this.d6_geometry) this.d6_geometry = this.create_d6_geometry(this.scale * 0.40);
        if (!this.dice_material) this.dice_material = new THREE.MeshFaceMaterial(
                this.create_dice_materials(this.standart_d6_dice_face_labels, this.scale / 2,0.40));
        this.dice_material.color = 0xffffff;
        return new THREE.Mesh(this.d6_geometry, this.dice_material);
    }

    this.create_d8 = function() {
        if (!this.d8_geometry) this.d8_geometry = this.create_d8_geometry(this.scale);
        if (!this.dice_material) this.dice_material = new THREE.MeshFaceMaterial(
                this.create_dice_materials(this.standart_d20_dice_face_labels, this.scale / 2, 1.2));
        return new THREE.Mesh(this.d8_geometry, this.dice_material);
    }

    this.create_d10 = function() {
        if (!this.d10_geometry) this.d10_geometry = this.create_d10_geometry(this.scale * 0.9);
        if (!this.dice_material) this.dice_material = new THREE.MeshFaceMaterial(
                this.create_dice_materials(this.standart_d20_dice_face_labels, this.scale / 2, 1.0));
        return new THREE.Mesh(this.d10_geometry, this.dice_material);
    }

    this.create_d12 = function() {
        if (!this.d12_geometry) this.d12_geometry = this.create_d12_geometry(this.scale * 0.9);
        if (!this.dice_material) this.dice_material = new THREE.MeshFaceMaterial(
                this.create_dice_materials(this.standart_d20_dice_face_labels, this.scale / 2, 1.0));
        return new THREE.Mesh(this.d12_geometry, this.dice_material);
    }

    this.create_d20 = function() {
        if (!this.d20_geometry) this.d20_geometry = this.create_d20_geometry(this.scale);
        if (!this.dice_material) this.dice_material = new THREE.MeshFaceMaterial(
                this.create_dice_materials(this.standart_d20_dice_face_labels, this.scale / 2, 1.0));
        return new THREE.Mesh(this.d20_geometry, this.dice_material);
    }

    this.create_d100 = function() {
        if (!this.d10_geometry) this.d10_geometry = this.create_d10_geometry(this.scale * 0.9);
        if (!this.d100_material) this.d100_material = new THREE.MeshFaceMaterial(
                this.create_dice_materials(this.standart_d100_dice_face_labels, this.scale / 2, 1.5));
        return new THREE.Mesh(this.d10_geometry, this.d100_material);
    }

    this.parse_notation = function(notation) {
        var no = notation.split('@');
        var dr0 = /\s*(\d*)([a-z]+)(\d+)(\s*(\+|\-)\s*(\d+)){0,1}\s*(\+|$)/gi;
        var dr1 = /(\b)*(\d+)(\b)*/gi;
        var ret = { set: [], constant: 0, result: [], error: false }, res;
        while (res = dr0.exec(no[0])) {
            var command = res[2];
            if (command != 'd') { ret.error = true; continue; }
            var count = parseInt(res[1]);
            if (res[1] == '') count = 1;
            var type = 'd' + res[3];
            if (this.known_types.indexOf(type) == -1) { ret.error = true; continue; }
            while (count--) ret.set.push(type);
            if (res[5] && res[6]) {
                if (res[5] == '+') ret.constant += parseInt(res[6]);
                else ret.constant -= parseInt(res[6]);
            }
        }
        while (res = dr1.exec(no[1])) {
            ret.result.push(parseInt(res[2]));
        }
        return ret;
    }

    this.stringify_notation = function(nn) {
        var dict = {}, notation = '';
        for (var i in nn.set) 
            if (!dict[nn.set[i]]) dict[nn.set[i]] = 1; else ++dict[nn.set[i]];
        for (var i in dict) {
            if (notation.length) notation += ' + ';
            notation += (dict[i] > 1 ? dict[i] : '') + i;
        }
        if (nn.constant) {
            if (nn.constant > 0) notation += ' + ' + nn.constant;
            else notation += ' - ' + Math.abs(nn.constant);
        }
        return notation;
    }

    var that = this;

    this.dice_box = function(container, dimentions) {
        this.use_adapvite_timestep = true;
        this.animate_selector = true;

        this.dices = [];
        this.scene = new THREE.Scene();
        this.world = new CANNON.World();

        this.renderer = window.WebGLRenderingContext
            ? new THREE.WebGLRenderer({ antialias: true, alpha: true })
            : new THREE.CanvasRenderer({ antialias: true, alpha: true });
        container.appendChild(this.renderer.domElement);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFShadowMap;
        this.renderer.setClearColor(0x000000, 0);

        this.reinit(container, dimentions);

        this.world.gravity.set(0, 0, -9.8 * 800);
        this.world.broadphase = new CANNON.NaiveBroadphase();
        this.world.solver.iterations = 16;

        var ambientLight = new THREE.AmbientLight(that.ambient_light_color);
        this.scene.add(ambientLight);

        this.dice_body_material = new CANNON.Material();
        var desk_body_material = new CANNON.Material();
        var barrier_body_material = new CANNON.Material();
        this.world.addContactMaterial(new CANNON.ContactMaterial(
                    desk_body_material, this.dice_body_material, 0.01, 0.5));
        this.world.addContactMaterial(new CANNON.ContactMaterial(
                    barrier_body_material, this.dice_body_material, 0, 1.0));
        this.world.addContactMaterial(new CANNON.ContactMaterial(
                    this.dice_body_material, this.dice_body_material, 0, 0.5));

        this.world.add(new CANNON.RigidBody(0, new CANNON.Plane(), desk_body_material));
        var barrier;
        barrier = new CANNON.RigidBody(0, new CANNON.Plane(), barrier_body_material);
        barrier.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), Math.PI / 2);
        barrier.position.set(0, this.h * 0.93, 0);
        this.world.add(barrier);

        barrier = new CANNON.RigidBody(0, new CANNON.Plane(), barrier_body_material);
        barrier.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
        barrier.position.set(0, -this.h * 0.93, 0);
        this.world.add(barrier);

        barrier = new CANNON.RigidBody(0, new CANNON.Plane(), barrier_body_material);
        barrier.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), -Math.PI / 2);
        barrier.position.set(this.w * 0.93, 0, 0);
        this.world.add(barrier);

        barrier = new CANNON.RigidBody(0, new CANNON.Plane(), barrier_body_material);
        barrier.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), Math.PI / 2);
        barrier.position.set(-this.w * 0.93, 0, 0);
        this.world.add(barrier);

        this.last_time = 0;
        this.running = false;

        this.renderer.render(this.scene, this.camera);
    }

    this.dice_box.prototype.reinit = function(container, dimentions) {
        this.cw = container.clientWidth / 2;
        this.ch = container.clientHeight / 2;
        if (dimentions) {
            this.w = dimentions.w;
            this.h = dimentions.h;
        }
        else {
            this.w = this.cw;
            this.h = this.ch;
        }
        this.aspect = Math.min(this.cw / this.w, this.ch / this.h);
        that.scale = Math.sqrt(this.w * this.w + this.h * this.h) / 13;

        this.renderer.setSize(this.cw * 2, this.ch * 2);

        this.wh = this.ch / this.aspect / Math.tan(10 * Math.PI / 180);
        if (this.camera) this.scene.remove(this.camera);
        this.camera = new THREE.PerspectiveCamera(20, this.cw / this.ch, 1, this.wh * 1.3);
        this.camera.position.z = this.wh;

        var mw = Math.max(this.w, this.h);
        if (this.light) this.scene.remove(this.light);
        this.light = new THREE.SpotLight(that.spot_light_color, 2.0);
        this.light.position.set(-mw / 2, mw / 2, mw * 2);
        this.light.target.position.set(0, 0, 0);
        this.light.distance = mw * 5;
        this.light.castShadow = true;
        this.light.shadowCameraNear = mw / 10;
        this.light.shadowCameraFar = mw * 5;
        this.light.shadowCameraFov = 50;
        this.light.shadowBias = 0.001;
        this.light.shadowDarkness = 1.1;
        this.light.shadowMapWidth = 1024;
        this.light.shadowMapHeight = 1024;
        this.scene.add(this.light);

        if (this.desk) this.scene.remove(this.desk);
        this.desk = new THREE.Mesh(new THREE.PlaneGeometry(this.w * 2, this.h * 2, 1, 1), 
                new THREE.MeshPhongMaterial({ opacity : 0,
                    transparent: true }));
        this.desk.receiveShadow = that.use_shadows;
        this.scene.add(this.desk);

        this.renderer.render(this.scene, this.camera);
    }

    function make_random_vector(vector) {
        var random_angle = rnd() * Math.PI / 5 - Math.PI / 5 / 2;
        var vec = {
            x: vector.x * Math.cos(random_angle) - vector.y * Math.sin(random_angle),
            y: vector.x * Math.sin(random_angle) + vector.y * Math.cos(random_angle)
        };
        if (vec.x == 0) vec.x = 0.01;
        if (vec.y == 0) vec.y = 0.01;
        return vec;
    }

    this.dice_box.prototype.generate_vectors = function(notation, vector, boost) {
        /*var vectors = [];
        for (var i in notation.set) {
            var vec = make_random_vector(vector);
            var pos = {
                x: this.w * (vec.x > 0 ? -1 : 1) * 0.9,
                y: this.h * (vec.y > 0 ? -1 : 1) * 0.9,
                z: rnd() * 200 + 200
            };
            var projector = Math.abs(vec.x / vec.y);
            if (projector > 1.0) pos.y /= projector; else pos.x *= projector;
            var velvec = make_random_vector(vector);
            var velocity = { x: velvec.x * boost, y: velvec.y * boost, z: -10 };
            var inertia = that.dice_inertia[notation.set[i]];
            var angle = {
                x: -(rnd() * vec.y * 5 + inertia * vec.y),
                y: rnd() * vec.x * 5 + inertia * vec.x,
                z: 0
            };
            var axis = { x: rnd(), y: rnd(), z: rnd(), a: rnd() };
            vectors.push({ set: notation.set[i], pos: pos, velocity: velocity, angle: angle, axis: axis });
        }



        return vectors;*/
        routteNumber++;
        if(routteNumber > 15 ){
            routteNumber = 1;
        }

        switch (routteNumber) {
            case 1:
                return vectorsRoute1(notation);
                break;
        
            case 2:
                return vectorsRoute2(notation);
                break;

            case 3:
                return vectorsRoute3(notation);
                break;
                
            case 4:
                return vectorsRoute4(notation);
                break;

            case 5:
                return vectorsRoute5(notation);
                break;

            case 6:
                return vectorsRoute6(notation);
                break;
                
            case 7:
                return vectorsRoute7(notation);
                break;                
                
            case 8:
                return vectorsRoute8(notation);
                break;

            case 9:
                return vectorsRoute9(notation);
                break;
                
            case 10:
                return vectorsRoute10(notation);
                break;
                
            case 11:
                return vectorsRoute11(notation);
                break;

            case 12:
                return vectorsRoute12(notation);
                break;    
                
            case 13:
                return vectorsRoute13(notation);
                break; 

            case 14:
                return vectorsRoute14(notation);
                break; 

            case 15:
                return vectorsRoute15(notation);
                break;             
        }
    
    }

    function vectorsRoute1(notation){
        var vectors = [];

        var angle = {x: -0.891129925361417, y: -19.568177784531365, z: 0};
        var axis = {x: 0.3393921659645831, y: 0.41045461068426947, z: 0.7740287752081518, a: 0.5880711347539425};
        var pos =  {x: 1440, y: -37.593302942613775, z: 244.95122165612452};
        var velocity = {x: -4354.425232478786, y: -747.6502489480425, z: -10};

        vectors.push({ set: notation.set[0], pos: pos, velocity: velocity, angle: angle, axis: axis });

        var angle2 = {x: -2.867727559384239, y: -15.29642699629228, z: 0};
        var axis2 = {x: 0.2956713687789332, y: 0.15412717608130344, z: 0.038517522206348964, a: 0.10156228735152051};
        var pos2 = {x: 1440, y: -123.49188670718796, z: 232.12182225420736};
        var velocity2 = {x: -4393.6877854066215, y: 464.22800903075785, z: -10};

        vectors.push({ set: notation.set[1], pos: pos2, velocity: velocity2, angle: angle2, axis: axis2 });

        return vectors;
    }

    function vectorsRoute2(notation){
        var vectors = [];

        var angle = {x: -0.5748018779725009, y: -15.094384893849275, z: 0};
        var axis = {x: 0.6185891030807231, y: 0.7087338185509193, z: 0.9924450913180942, a: 0.42029203516553215};
        var pos = {x: 1440, y: -21.2676389459489, z: 207.82526519825177};
        var velocity = {x: -4353.731255946958, y: -751.6808837468981, z: -10};

        vectors.push({ set: notation.set[0], pos: pos, velocity: velocity, angle: angle, axis: axis });

        var angle2 = {x: 1.7977647334909928, y: -16.837934106234005, z: 0};
        var axis2 = {x: 0.5919852652456004, y: 0.04684805785477075, z: 0.6392093001942745, a: 0.08538445715128495};
        var pos2 = {x: 1440, y: 71.67778178318676, z: 374.69934163116153};
        var velocity2 = {x: -4401.17112367317, y: -386.9014605108678, z: -10};

        vectors.push({ set: notation.set[1], pos: pos2, velocity: velocity2, angle: angle2, axis: axis2 });

        return vectors;
    }

    function vectorsRoute3(notation){
        var vectors = [];

        var angle = {x: 0.27726605582821734, y: -15.356447031265, z: 0};
        var axis = {x: 0.5234067805619593, y: 0.19884212562108483, z: 0.44148764299396137, a: 0.06608084730494235};
        var pos ={x: 1440, y: 10.376090099541564, z: 348.99574129620464};
        var velocity = {x: -4384.454420543731, y: -544.5727078862212, z: -10};

        vectors.push({ set: notation.set[0], pos: pos, velocity: velocity, angle: angle, axis: axis });

        var angle2 ={x: -3.9780978266326703, y: -19.120115087282816, z: 0};
        var axis2 = {x: 0.1557854679360826, y: 0.006327242251711107, z: 0.43032530338490704, a: 0.4054435531078635};
        var pos2 ={x: 1440, y: -147.30754848106045, z: 379.28213245737464};
        var velocity2 = {x: -4135.061169494065, y: 1556.042777221233, z: -10};

        vectors.push({ set: notation.set[1], pos: pos2, velocity: velocity2, angle: angle2, axis: axis2 });

        return vectors;
    }

    function vectorsRoute4(notation){
        var vectors = [];

        var angle = {x: 3.3062131580601, y: -19.070503450927532, z: 0};
        var axis = {x: 0.5463957174285803, y: 0.6082739791042064, z: 0.8197514720021857, a: 0.39972808036029894};
        var pos = {x: 1440, y: 159.09111679131814, z: 332.8480306778469};
        var velocity = {x: -4394.91723130401, y: -452.4406369758283, z: -10};

        vectors.push({ set: notation.set[0], pos: pos, velocity: velocity, angle: angle, axis: axis });

        var angle2 ={x: -1.1285482252455707, y: -15.650178969932044, z: 0};
        var axis2 ={x: 0.719858589515854, y: 0.6857441908806585, z: 0.6753337062671807, a: 0.22943165610613603};
        var pos2 = {x: 1440, y: -52.207424016347765, z: 384.35485464280333};
        var velocity2 ={x: -4140.5397977022385, y: 1541.4052626236578, z: -10};

        vectors.push({ set: notation.set[1], pos: pos2, velocity: velocity2, angle: angle2, axis: axis2 });

        return vectors;
    }


    function vectorsRoute5(notation){
        var vectors = [];

        var angle = {x: -3.644149922330877, y: -15.346393351431097, z: 0};
        var axis = {x: 0.4794917338475091, y: 0.27421189496144227, z: 0.34258775936714025, a: 0.35646942758564126};
        var pos = {x: 1440, y: -156.30164545761744, z: 227.40744142479952};
        var velocity = {x: -4332.21460337759, y: -867.1312647355952, z: -10};

        vectors.push({ set: notation.set[0], pos: pos, velocity: velocity, angle: angle, axis: axis });

        var angle2 ={x: 2.9540778599772843, y: -18.367239211140937, z: 0};
        var axis2 ={x: 0.6774298555368641, y: 0.6254503373117604, z: 0.5662600535577393, a: 0.8414116984007605};
        var pos2 = {x: 1440, y: 120.34568917921962, z: 267.6847433240812};
        var velocity2 = {x: -4359.801990850418, y: -715.6302121743668, z: -10};

        vectors.push({ set: notation.set[1], pos: pos2, velocity: velocity2, angle: angle2, axis: axis2 });

        return vectors;
    }
    
   
    function vectorsRoute6(notation){
        var vectors = [];

        var angle = {x: -0.8498158304752458, y: -18.210883825020566, z: 0};
        var axis = {x: 0.3593485348851768, y: 0.9323144036884157, z: 0.3257770418207322, a: 0.4264446277539997};
        var pos = {x: 1440, y: -40.82959573217254, z: 292.8100242720062};
        var velocity = {x: -4413.037816345691, y: -212.36108754398037, z: -10};

        vectors.push({ set: notation.set[0], pos: pos, velocity: velocity, angle: angle, axis: axis });

        var angle2 = {x: -5.118270759304472, y: -15.125875116686949, z: 0};
        var axis2 = {x: 0.7837170334699541, y: 0.6881257666359208, z: 0.27698364778363405, a: 0.7151831695066524};
        var pos2 = {x: 1440, y: -259.1702078563669, z: 315.5444121831929};
        var velocity2 = {x: -4393.940817286756, y: 461.82690933010156, z: -10};

        vectors.push({ set: notation.set[1], pos: pos2, velocity: velocity2, angle: angle2, axis: axis2 });

        return vectors;
    }

    function vectorsRoute7(notation){
        var vectors = [];

        var angle = {x: -2.423343081048511, y: -16.977857860528747, z: 0};
        var axis = {x: 0.03068793166042294, y: 0.6214320617102387, z: 0.3642348972847611, a: 0.14955602790263822};
        var pos = {x: 1440, y: -213.26048055010946, z: 271.52395261458406};
        var velocity = {x: -4378.032973834673, y: -593.9926599010595, z: -10};

        vectors.push({ set: notation.set[0], pos: pos, velocity: velocity, angle: angle, axis: axis });

        var angle2 ={x: -4.103904791019755, y: -15.489456670482529, z: 0};
        var axis2 = {x: 0.9410333592449045, y: 0.21819495562079072, z: 0.7811359170681669, a: 0.47189170538061953};
        var pos2 = {x: 1440, y: -190.9489061180378, z: 256.34332495075023};
        var velocity2 = {x: -4148.009742135811, y: 1521.1887388310497, z: -10};

        vectors.push({ set: notation.set[1], pos: pos2, velocity: velocity2, angle: angle2, axis: axis2 });

        return vectors;
    }

    function vectorsRoute8(notation){
        var vectors = [];

        var angle = {x: 3.4168120793754193, y: -19.440807813517555, z: 0};
        var axis = {x: 0.43439916901360687, y: 0.5941598429835051, z: 0.2563607350724937, a: 0.05440686100325842};
        var pos = {x: 1440, y: 132.98704953270163, z: 225.20091012878737};
        var velocity = {x: -4351.181398470557, y: -766.3030977386256, z: -10};

        vectors.push({ set: notation.set[0], pos: pos, velocity: velocity, angle: angle, axis: axis });

        var angle2 = {x: 1.0136567358160304, y: -19.344479708569825, z: 0};
        var axis2 = {x: 0.397443666887463, y: 0.7038071386352864, z: 0.44701405055367593, a: 0.06334708186630911};
        var pos2 = {x: 1440, y: 40.58886573318478, z: 397.50500421590965};
        var velocity2 = {x: -4170.440018619597, y: 1458.5712362089735, z: -10};

        vectors.push({ set: notation.set[1], pos: pos2, velocity: velocity2, angle: angle2, axis: axis2 });

        return vectors;
    }

    function vectorsRoute9(notation){
        var vectors = [];

        var angle = {x: 2.9118706247011072, y: -19.346088281886846, z: 0};
        var axis = {x: 0.7862490531577462, y: 0.8196145250758671, z: 0.09328211073538539, a: 0.5519391649733512};
        var pos = {x: 1440, y: 131.22691524472881, z: 299.63134880348684};
        var velocity = {x: -4404.395119395457, y: 348.28670983182445, z: -10};

        vectors.push({ set: notation.set[0], pos: pos, velocity: velocity, angle: angle, axis: axis });

        var angle2 = {x: -2.5909523667017003, y: -15.337867595583635, z: 0};
        var axis2 =  {x: 0.903030928987216, y: 0.44663388124242265, z: 0.3521289598989257, a: 0.7532690654728602};
        var pos2 = {x: 1440, y: -106.88308210697637, z: 284.53985542045734};
        var velocity2 = {x: -4337.941020868238, y: -838.0141403751048, z: -10};

        vectors.push({ set: notation.set[1], pos: pos2, velocity: velocity2, angle: angle2, axis: axis2 });

        return vectors;
    }

    function vectorsRoute10(notation){
        var vectors = [];

        var angle = {x: -5.661316994697295, y: -17.418792628285814, z: 0};
        var axis = {x: 0.7522115890341476, y: 0.6553769554488127, z: 0.7630572249290737, a: 0.9695320858773762};
        var pos = {x: 1440, y: -260.7124239968982, z: 275.9767496935317};
        var velocity = {x: -4412.794906118911, y: 217.3502163122738, z: -10};

        vectors.push({ set: notation.set[0], pos: pos, velocity: velocity, angle: angle, axis: axis });

        var angle2 = {x: -2.918290780370343, y: -16.150444164519275, z: 0};
        var axis2 = {x: 0.26935258817434393, y: 0.5594453234134238, z: 0.6816378113511554, a: 0.07899751767605179};
        var pos2 = {x: 1440, y: -129.76069085654225, z: 307.0479435379433};
        var velocity2 = {x: -4303.313221611084, y: 1000.7473790658798, z: -10};

        vectors.push({ set: notation.set[1], pos: pos2, velocity: velocity2, angle: angle2, axis: axis2 });

        return vectors;
    }
    

    function vectorsRoute11(notation){
        var vectors = [];

        var angle = {x: -3.5740326531376154, y: -17.725155199326323, z: 0};
        var axis = {x: 0.6759292215650841, y: 0.2619651926888633, z: 0.13931152861920681, a: 0.1716710679672797};
        var pos = {x: 1440, y: -160.2700753893475, z: 383.0962954895407};
        var velocity = {x: -4395.775803314806, y: -444.02149384019395, z: -10};

        vectors.push({ set: notation.set[0], pos: pos, velocity: velocity, angle: angle, axis: axis });

        var angle2 = {x: -4.009189258497674, y: -19.135126320190828, z: 0};
        var axis2 = {x: 0.7446505866788691, y: 0.19450776408396186, z: 0.6947844320512411, a: 0.6119940414751186};
        var pos2 = {x: 1440, y: -166.84049966216756, z: 364.86820437251674};
        var velocity2 = {x: -4414.235544452198, y: -185.80785261878077, z: -10};

        vectors.push({ set: notation.set[1], pos: pos2, velocity: velocity2, angle: angle2, axis: axis2 });

        return vectors;
    }


    function vectorsRoute12(notation){
        var vectors = [];

        var angle = {x: 2.3141462003640507, y: -19.703459643565605, z: 0};
        var axis =  {x: 0.0761418460183736, y: 0.3898456725754824, z: 0.7615724440051117, a: 0.786600995991606};
        var pos = {x: 1440, y: 84.0737695403884, z: 333.0854559346433};
        var velocity = {x: -4372.337698168449, y: -634.5573679148524, z: -10};

        vectors.push({ set: notation.set[0], pos: pos, velocity: velocity, angle: angle, axis: axis });

        var angle2 = {x: -1.255758084310185, y: -18.046661649653956, z: 0};
        var axis2 = {x: 0.09332368726357498, y: 0.5291025703849426, z: 0.29047332461680075, a: 0.8629846655599567};
        var pos2 = {x: 1440, y: -53.90595901301427, z: 278.113154775602};
        var velocity2 = {x: -4272.302677063112, y: 1125.8018633664467, z: -10};

        vectors.push({ set: notation.set[1], pos: pos2, velocity: velocity2, angle: angle2, axis: axis2 });

        return vectors;
    }
    

    function vectorsRoute13(notation){
        var vectors = [];

        var angle = {x: 0.017990020694314292, y: -15.376706089503902, z: 0};
        var axis =  {x: 0.4686563146643652, y: 0.7031308192238461, z: 0.3689752358713281, a: 0.8133833679837164};
        var pos = {x: 1440, y: 0.7460210781247966, z: 279.5381880483095};
        var velocity = {x: -4417.955695559513, y: 40.83469203094771, z: -10};

        vectors.push({ set: notation.set[0], pos: pos, velocity: velocity, angle: angle, axis: axis });

        var angle2 = {x: -6.827758155493921, y: -16.656991361292942, z: 0};
        var axis2 = {x: 0.8335934656572537, y: 0.1489948529940366, z: 0.9561687742932805, a: 0.21470879208335947};
        var pos2 = {x: 1440, y: -293.99568656500213, z: 306.17967407896265};
        var velocity2 = {x: -4414.740430790777, y: -173.39817975188032, z: -10};

        vectors.push({ set: notation.set[1], pos: pos2, velocity: velocity2, angle: angle2, axis: axis2 });

        return vectors;
    }

    function vectorsRoute14(notation){
        var vectors = [];

        var angle = {x: 0.46086945706115023, y: -16.959937320037312, z: 0};
        var axis =  {x: 0.5715887947245557, y: 0.8568428967425434, z: 0.1585240818613336, a: 0.6460168765300114};
        var pos = {x: 1440, y: 18.293856081408187, z: 344.7571884875614};
        var velocity = {x: -4409.936696135546, y: 269.1808612756534, z: -10};

        vectors.push({ set: notation.set[0], pos: pos, velocity: velocity, angle: angle, axis: axis });

        var angle2 = {x: -6.372033927752815, y: -16.492562522900027, z: 0};
        var axis2 = {x: 0.5734401162474922, y: 0.06228936969771537, z: 0.4681103131308062, a: 0.8631639056190084};
        var pos2 = {x: 1440, y: -274.9070979407664, z: 237.39418042001464};
        var velocity2 = {x: -4166.0696123526695, y: 1471.0078127024588, z: -10};

        vectors.push({ set: notation.set[1], pos: pos2, velocity: velocity2, angle: angle2, axis: axis2 });

        return vectors;
    }


    function vectorsRoute15(notation){
        var vectors = [];

        var angle = {x: -1.5280572750151509, y: -17.12306193796727, z: 0};
        var axis =  {x: 0.38357363508032694, y: 0.12411583328673892, z: 0.45576334435322563, a: 0.495466242421029};
        var pos = {x: 1440, y: -57.867021811121354, z: 268.1917355643216};
        var velocity = {x: -4239.110249400413, y: 1244.9675873003168, z: -10};

        vectors.push({ set: notation.set[0], pos: pos, velocity: velocity, angle: angle, axis: axis });

        var angle2 = {x: -1.1552961786270364, y: -18.080672211358845, z: 0};
        var axis2 = {x: 0.6909805973789229, y: 0.27896181846101165, z: 0.9942389768695663, a: 0.24661034662494408};
        var pos2 = {x: 1440, y: -50.52091927634222, z: 261.0789709366559};
        var velocity2 = {x: -4219.160956487057, y: 1310.9846769719384, z: -10};

        vectors.push({ set: notation.set[1], pos: pos2, velocity: velocity2, angle: angle2, axis: axis2 });

        return vectors;
    }
    
    this.dice_box.prototype.create_dice = function(type, pos, velocity, angle, axis) {
        var dice = that['create_' + type]();
        dice.castShadow = true;
        dice.dice_type = type;
        dice.body = new CANNON.RigidBody(that.dice_mass[type],
                dice.geometry.cannon_shape, this.dice_body_material);
        dice.body.position.set(pos.x, pos.y, pos.z);
        dice.body.quaternion.setFromAxisAngle(new CANNON.Vec3(axis.x, axis.y, axis.z), axis.a * Math.PI * 2);
        dice.body.angularVelocity.set(angle.x, angle.y, angle.z);
        dice.body.velocity.set(velocity.x, velocity.y, velocity.z);
        dice.body.linearDamping = 0.1;
        dice.body.angularDamping = 0.1;
        this.scene.add(dice);
        this.dices.push(dice);
        this.world.add(dice.body);
    }

    this.dice_box.prototype.check_if_throw_finished = function() {
        var res = true;
        var e = 6;
        if (this.iteration < 10 / that.frame_rate) {
            for (var i = 0; i < this.dices.length; ++i) {
                var dice = this.dices[i];
                if (dice.dice_stopped === true) continue;
                var a = dice.body.angularVelocity, v = dice.body.velocity;
                if (Math.abs(a.x) < e && Math.abs(a.y) < e && Math.abs(a.z) < e &&
                        Math.abs(v.x) < e && Math.abs(v.y) < e && Math.abs(v.z) < e) {
                    if (dice.dice_stopped) {
                        if (this.iteration - dice.dice_stopped > 3) {
                            dice.dice_stopped = true;
                            continue;
                        }
                    }
                    else dice.dice_stopped = this.iteration;
                    res = false;
                }
                else {
                    dice.dice_stopped = undefined;
                    res = false;
                }
            }
        }
        return res;
    }

    function get_dice_value(dice) {
        var vector = new THREE.Vector3(0, 0, dice.dice_type == 'd4' ? -1 : 1);
        var closest_face, closest_angle = Math.PI * 2;
        for (var i = 0, l = dice.geometry.faces.length; i < l; ++i) {
            var face = dice.geometry.faces[i];
            if (face.materialIndex == 0) continue;
            var angle = face.normal.clone().applyQuaternion(dice.body.quaternion).angleTo(vector);
            if (angle < closest_angle) {
                closest_angle = angle;
                closest_face = face;
            }
        }
        var matindex = closest_face.materialIndex - 1;
        if (dice.dice_type == 'd100') matindex *= 10;
        if (dice.dice_type == 'd10' && matindex == 0) matindex = 10;
        return matindex;
    }

    function get_dice_values(dices) {
        var values = [];
        for (var i = 0, l = dices.length; i < l; ++i) {
            values.push(get_dice_value(dices[i]));
        }
        return values;
    }

    this.dice_box.prototype.emulate_throw = function() {
        while (!this.check_if_throw_finished()) {
            ++this.iteration;
            this.world.step(that.frame_rate);
        }
        return get_dice_values(this.dices);
    }

    this.dice_box.prototype.__animate = function(threadid) {
        var time = (new Date()).getTime();
        var time_diff = (time - this.last_time) / 1000;
        if (time_diff > 3) time_diff = that.frame_rate;
        ++this.iteration;
        if (this.use_adapvite_timestep) {
            while (time_diff > that.frame_rate * 1.1) {
                this.world.step(that.frame_rate);
                time_diff -= that.frame_rate;
            }
            this.world.step(time_diff);
        }
        else {
            this.world.step(that.frame_rate);
        }
        for (var i in this.scene.children) {
            var interact = this.scene.children[i];
            if (interact.body != undefined) {
                interact.position.copy(interact.body.position);
                interact.quaternion.copy(interact.body.quaternion);
            }
        }
        this.renderer.render(this.scene, this.camera);
        this.last_time = this.last_time ? time : (new Date()).getTime();
        if (this.running == threadid && this.check_if_throw_finished()) {
            this.running = false;
            if (this.callback) this.callback.call(this, get_dice_values(this.dices));
        }
        if (this.running == threadid) {
            (function(t, tid, uat) {
                if (!uat && time_diff < that.frame_rate) {
                    setTimeout(function() { requestAnimationFrame(function() { t.__animate(tid); }); },
                        (that.frame_rate - time_diff) * 1000);
                }
                else requestAnimationFrame(function() { t.__animate(tid); });
            })(this, threadid, this.use_adapvite_timestep);
        }
    }

    this.dice_box.prototype.clear = function() {
        this.running = false;
        var dice;
        while (dice = this.dices.pop()) {
            this.scene.remove(dice); 
            if (dice.body) this.world.remove(dice.body);
        }
        if (this.pane) this.scene.remove(this.pane);
        this.renderer.render(this.scene, this.camera);
        var box = this;
        setTimeout(function() { box.renderer.render(box.scene, box.camera); }, 100);
    }

    this.dice_box.prototype.prepare_dices_for_roll = function(vectors) {
        this.clear();
        this.iteration = 0;
        for (var i in vectors) {
            this.create_dice(vectors[i].set, vectors[i].pos, vectors[i].velocity,
                    vectors[i].angle, vectors[i].axis);
        }
    }

    function shift_dice_faces(dice, value, res) {
        var r = that.dice_face_range[dice.dice_type];
        if (dice.dice_type == 'd10' && value == 10) value = 0;
        if (!(value >= r[0] && value <= r[1])) return;
        var num = value - res;
        var geom = dice.geometry.clone();
        for (var i = 0, l = geom.faces.length; i < l; ++i) {
            var matindex = geom.faces[i].materialIndex;
            if (matindex == 0) continue;
            matindex += num - 1;
            while (matindex > r[1]) matindex -= r[1];
            while (matindex < r[0]) matindex += r[1];
            geom.faces[i].materialIndex = matindex + 1;
        }
        if (dice.dice_type == 'd4' && num != 0) {
            if (num < 0) num += 4;
            dice.material = new THREE.MeshFaceMaterial(
                    that.create_d4_materials(that.scale / 2, that.scale * 2, d4_labels[num]));
        }
        dice.geometry = geom;
    }

    this.dice_box.prototype.roll = function(vectors, values, callback) {
        this.prepare_dices_for_roll(vectors);
        if (values != undefined && values.length) {
            this.use_adapvite_timestep = false;
            var res = this.emulate_throw();
            this.prepare_dices_for_roll(vectors);
            for (var i in res)
                shift_dice_faces(this.dices[i], values[i], res[i]);
        }
        this.callback = callback;
        this.running = (new Date()).getTime();
        this.last_time = 0;
        this.__animate(this.running);
    }

    this.dice_box.prototype.__selector_animate = function(threadid) {
        var time = (new Date()).getTime();
        var time_diff = (time - this.last_time) / 1000;
        if (time_diff > 3) time_diff = that.frame_rate;
        var angle_change = 0.3 * time_diff * Math.PI * Math.min(24000 + threadid - time, 6000) / 6000;
        if (angle_change < 0) this.running = false;
        for (var i in this.dices) {
            this.dices[i].rotation.y += angle_change;
            this.dices[i].rotation.x += angle_change / 4;
            this.dices[i].rotation.z += angle_change / 10;
        }
        this.last_time = time;
        this.renderer.render(this.scene, this.camera);
        if (this.running == threadid) {
            (function(t, tid) {
                requestAnimationFrame(function() { t.__selector_animate(tid); });
            })(this, threadid);
        }
    }

    this.dice_box.prototype.search_dice_by_mouse = function(ev) {
        var m = $t.get_mouse_coords(ev);
        var intersects = (new THREE.Raycaster(this.camera.position, 
                    (new THREE.Vector3((m.x - this.cw) / this.aspect,
                                       1 - (m.y - this.ch) / this.aspect, this.w / 9))
                    .sub(this.camera.position).normalize())).intersectObjects(this.dices);
        if (intersects.length) return intersects[0].object.userData;
    }

    this.dice_box.prototype.draw_selector = function() {
        this.clear();
        var step = this.w / 4.5;
        this.pane = new THREE.Mesh(new THREE.PlaneGeometry(this.w * 6, this.h * 6, 1, 1), 
                new THREE.MeshPhongMaterial(that.selector_back_colors));
        this.pane.receiveShadow = true;
        this.pane.position.set(0, 0, 1);
        this.scene.add(this.pane);

        var mouse_captured = false;

        for (var i = 0, pos = -3; i < that.known_types.length; ++i, ++pos) {
            var dice = $t.dice['create_' + that.known_types[i]]();
            dice.position.set(pos * step, 0, step * 0.5);
            dice.castShadow = true;
            dice.userData = that.known_types[i];
            this.dices.push(dice); this.scene.add(dice);
        }

        this.running = (new Date()).getTime();
        this.last_time = 0;
        if (this.animate_selector) this.__selector_animate(this.running);
        else this.renderer.render(this.scene, this.camera);
    }

    function throw_dices(box, vector, boost, dist, notation_getter, before_roll, after_roll) {
        var uat = $t.dice.use_adapvite_timestep;
        function roll(request_results) {
            if (after_roll) {
                box.clear();
                box.roll(vectors, request_results || notation.result, function(result) {
                    if (after_roll) after_roll.call(box, notation, result);
                    box.rolling = false;
                    $t.dice.use_adapvite_timestep = uat;
                });
            }
        }
        vector.x /= dist; vector.y /= dist;
        var notation = notation_getter.call(box);
        if (notation.set.length == 0) return;
        var vectors = box.generate_vectors(notation, vector, boost);
        box.rolling = true;
        if (before_roll) before_roll.call(box, vectors, notation, roll);
        else roll();
    }

    this.dice_box.prototype.bind_mouse = function(container, notation_getter, before_roll, after_roll) {
        var box = this;
        $t.bind(container, ['mousedown', 'touchstart'], function(ev) {
            ev.preventDefault();
            box.mouse_time = (new Date()).getTime();
            box.mouse_start = $t.get_mouse_coords(ev);
        });
        $t.bind(container, ['mouseup', 'touchend'], function(ev) {
            if (box.rolling) return;
            if (box.mouse_start == undefined) return;
            ev.stopPropagation();
            var m = $t.get_mouse_coords(ev);
            var vector = { x: m.x - box.mouse_start.x, y: -(m.y - box.mouse_start.y) };
            box.mouse_start = undefined;
            var dist = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
            if (dist < Math.sqrt(box.w * box.h * 0.01)) return;
            var time_int = (new Date()).getTime() - box.mouse_time;
            if (time_int > 2000) time_int = 2000;
            var boost = Math.sqrt((2500 - time_int) / 2500) * dist * 2;
            prepare_rnd(function() {
                throw_dices(box, vector, boost, dist, notation_getter, before_roll, after_roll);
            });
        });
    }

    this.dice_box.prototype.bind_throw = function(button, notation_getter, before_roll, after_roll) {
        var box = this;
        $t.bind(button, ['mouseup', 'touchend'], function(ev) {
            ev.stopPropagation();
            box.start_throw(notation_getter, before_roll, after_roll);
        });
    }

    this.dice_box.prototype.start_throw = function(notation_getter, before_roll, after_roll) {
        var box = this;
        if (box.rolling) return;
        prepare_rnd(function() {
            var vector = { x: -1100, y: 100 };
            var dist = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
            var boost =  4 * dist;
            throw_dices(box, vector, boost, dist, notation_getter, before_roll, after_roll);
        });
    }

}).apply(teal.dice = teal.dice || {});

