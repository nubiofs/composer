/*
 * (c) 2014 Boundless, http://boundlessgeo.com
 */
angular.module('gsApp.workspaces.maps.settings', [])
.controller('EditMapSettingsCtrl', ['workspace', 'map', '$scope', '$rootScope',
  '$state', '$log', '$modalInstance', 'GeoServer', 'AppEvent',
    function(workspace, map, $scope, $rootScope, $state, $log, $modalInstance,
      GeoServer, AppEvent) {

      $scope.workspace = workspace;
      $scope.map = angular.copy(map);
      $scope.mapname = map.name;

      $scope.form = {};
      $scope.form.mapSettings = {};
      var originalMap = angular.copy($scope.map);

      $scope.crsTooltip =
      '<p>Add a projection in EPSG</p>' +
      '<p><small>Coordinate Reference System (CRS) info is available at ' +
        '<a href="http://prj2epsg.org/search" target="_blank">' +
          'http://prj2epsg.org' +
        '</a>' +
        '</small></p>';

      $scope.extentTooltip =
      '<p>Map Extent</p>' +
      '<small class="hint"> The default region visible when rendering ' +
      'the map.<br/>The map extent should be provided in the same units ' +
      'as the projection: degrees for EPSG:4326 or meters for most ' +
      'other EPSG codes.<br/><br/>"Generate Bounds" will calculate the ' +
      'net layer bounds in the current projection.</small>';

      $scope.renderTooltip =
      '<p>Render Timeout</p>' +
      '<small class="hint">Max time to wait for map to render in ' +
      'Composer before the request is cancelled.<br/>A lower number prevents '+
      'overloading GeoServer with resource-monopolizing rendering '+
      'requests.<br/><br/>Minimum is 3 seconds.<br/><br/>Default is ' +
      '120 seconds.<br/>(This is set high so you can still render ' +
      'large datasets, but we ecommend reducing this for a more ' +
      'performant or shared GeoServer).</small>';

      $scope.saveChanges = function() {
        if ($scope.form.mapSettings.$dirty) {
          var patch = { 'bbox': {}, 'center': [2] };
          if (originalMap.name !== $scope.map.name) {
            patch.name = $scope.map.name;
          }
          if (originalMap.title !== $scope.map.title) {
            patch.title = $scope.map.title;
          }

          //bbox and proj are interdependant for maps
          if (originalMap.bbox !== $scope.map.bbox || originalMap.proj.srs !== $scope.map.proj.srs) {
            patch.proj = $scope.map.proj.srs;
            patch.bbox.south = $scope.map.bbox.south;
            patch.bbox.west = $scope.map.bbox.west;
            patch.bbox.north = $scope.map.bbox.north;
            patch.bbox.east = $scope.map.bbox.east;
          }

          if (originalMap.description !== $scope.map.description) {
            patch.description = $scope.map.description;
          }

          if (originalMap.timeout !== $scope.map.timeout) {
            patch.timeout = $scope.map.timeout;
          }

          GeoServer.map.update($scope.workspace, originalMap.name, patch).then(
            function(result) {
              if (result.success) {
                $scope.form.mapSettings.alerts = null;
                $scope.form.mapSettings.saved = true;
                $scope.form.mapSettings.$setPristine();
                $rootScope.$broadcast(AppEvent.MapUpdated, {
                  'original': originalMap,
                  'new': result.data
                });
                $scope.map = result.data;
                originalMap = angular.copy($scope.map);
              } else {
                $rootScope.alerts = [{
                  type: 'danger',
                  message: 'Map update failed: ' + result.data.message,
                  details: result.data.trace,
                  fadeout: true
                }];
                $scope.form.mapSettings.saved = false;
                $scope.form.mapSettings.alerts =
                  'Error: ' + result.data.message;
              }
            });
        }
      };

      $scope.deleteMap = function () {
        GeoServer.map.delete($scope.workspace, originalMap.name, {'name': originalMap.name})
        .then(function(result) {
            if (result.success) {
              $rootScope.$broadcast(AppEvent.MapRemoved, originalMap);
              $rootScope.alerts = [{
                type: 'success',
                message: 'Map ' + originalMap.name + ' successfully deleted.',
                fadeout: true
              }];
              $modalInstance.dismiss('close');
            } else {
              $rootScope.alerts = [{
                type: 'danger',
                message: 'Map ' + originalMap.name + ' could not be deleted: ' + result.data.message,
                details: result.data.trace,
                fadeout: true
              }];
            }
          });
      };

      $scope.calculateBounds = function() {
        GeoServer.map.bounds($scope.workspace, originalMap.name, {"proj":$scope.map.proj.srs}).then(function(result) {
            if (result.success) {
              if ($scope.form.mapSettings && $scope.map.bbox != result.data.bbox.native) {
                $scope.form.mapSettings.$dirty = true;
              }
              $scope.map.bbox = result.data.bbox.native;
            } else {
              $rootScope.alerts = [{
                type: 'danger',
                message: 'Error calculating bounds: '+result.data.message,
                details: result.data.trace,
                fadeout: true
              }];
            }
          });
      }

      $scope.cancel = function () {
        $modalInstance.dismiss('cancel');
      };
    }]);
